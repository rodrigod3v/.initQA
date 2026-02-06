import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';
import { ContractService } from '../../contract/contract.service';
import { UtilsService } from '../../utils/utils.service';
import * as vm from 'vm';
import Ajv from 'ajv';

interface ExecutionResponse {
  status: number;
  data: unknown;
  headers: Record<string, string>;
}

@Injectable()
export class ExecutionService {
  constructor(
    private prisma: PrismaService,
    private contractService: ContractService,
    private utilsService: UtilsService,
  ) {}

  async execute(requestId: string, environmentId?: string) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error('Request not found');
    }

    let variables: Record<string, unknown> = {};
    let validEnvironmentId: string | null = null;

    if (environmentId) {
      const environment = await this.prisma.environment.findUnique({
        where: { id: environmentId },
      });
      if (environment) {
        validEnvironmentId = environment.id;
        variables = (environment.variables as Record<string, unknown>) || {};
      }
    }

    // Replace placeholders in URL, headers, and body
    const url = this.utilsService.replaceVariables(
      request.url,
      variables,
    ) as string;
    const headers = this.utilsService.replaceVariables(
      request.headers,
      variables,
    ) as Record<string, string>;
    const body = this.utilsService.replaceVariables(request.body, variables);

    // Handle Protocol specific logic
    let effectiveMethod = request.method;
    let effectiveBody = body;

    const isGraphQL =
      (request as unknown as { protocol: string }).protocol === 'GRAPHQL';

    if (isGraphQL) {
      effectiveMethod = 'POST';
      // If it's a string, try to wrap it in a GQL payload if it's not already
      if (typeof effectiveBody === 'string') {
        try {
          const parsed = JSON.parse(effectiveBody) as Record<string, unknown>;
          if (!parsed.query) {
            effectiveBody = { query: effectiveBody };
          }
        } catch {
          effectiveBody = { query: effectiveBody };
        }
      } else if (
        effectiveBody &&
        typeof effectiveBody === 'object' &&
        !Object.prototype.hasOwnProperty.call(effectiveBody, 'query')
      ) {
        effectiveBody = { query: JSON.stringify(effectiveBody) };
      }
    }

    // Build final headers object
    const finalHeaders = {
      Accept: 'application/json, text/plain, */*',
      'User-Agent': 'initQA-System-Agent/1.0',
      ...(headers || {}),
    };

    // Auto-set Content-Type if body exists and not explicitly set
    if (
      body &&
      !finalHeaders['Content-Type'] &&
      !finalHeaders['content-type']
    ) {
      finalHeaders['Content-Type'] = 'application/json';
    }

    let attempts = 0;
    const maxAttempts = request.method === 'GET' ? 3 : 1;
    let response: ExecutionResponse = {
      status: 0,
      data: null,
      headers: {},
    };
    const startTime = Date.now();

    while (attempts < maxAttempts) {
      attempts++;
      try {
        console.log(
          `[EXECUTION] [${request.method}] Attempt ${attempts}/${maxAttempts} for ${url}`,
        );

        const axiosResponse = await axios({
          method: effectiveMethod,
          url: url,
          headers: finalHeaders,
          data: effectiveBody,
          timeout: 30000, // 30 seconds timeout
          validateStatus: () => true, // Capture all status codes
        });

        response = {
          status: axiosResponse.status,
          data: axiosResponse.data,

          headers: axiosResponse.headers as Record<string, string>,
        };

        break;
      } catch (error) {
        const errorCode =
          typeof error === 'object' && error !== null && 'code' in error
            ? String((error as Record<string, unknown>).code)
            : 'UNKNOWN';

        const isNetworkError =
          errorCode === 'ECONNREFUSED' ||
          errorCode === 'ENOTFOUND' ||
          errorCode === 'ETIMEDOUT';
        if (attempts >= maxAttempts || !isNetworkError) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const errorCode =
            typeof error === 'object' && error !== null && 'code' in error
              ? String((error as Record<string, unknown>).code)
              : 'UNKNOWN';

          console.error(`[EXECUTION] [ERROR] ${url}: ${errorMessage}`);

          const duration = Date.now() - startTime;

          return await this.prisma.requestExecution.create({
            data: {
              requestId: request.id,
              environmentId: validEnvironmentId,
              status: errorCode === 'ETIMEDOUT' ? 408 : 500,
              duration,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              response: {
                error: 'EXECUTION_FAILED',
                message: errorMessage,
                code: errorCode,
                attempts,
              } as any,
            },
          });
        }
        console.warn(
          `[EXECUTION] [RETRY] Failed attempt ${attempts} for ${url}. Error: ${errorCode}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[EXECUTION] [SUCCESS] ${url} returned ${String(response.status)} in ${duration}ms`,
    );

    // Validate contract if schema exists
    let validationResult: Record<string, unknown> | null = null;
    if (request.expectedResponseSchema) {
      validationResult = this.contractService.validate(
        request.expectedResponseSchema as any,
        response.data,
      ) as Record<string, unknown>;
    }

    // RUN TEST SCRIPTS
    let testResults: Record<string, unknown>[] | null = null;
    let updatedVariables = { ...variables };
    let variablesChanged = false;

    if (request.testScript) {
      const scriptResult = this.runTestScript(
        request.testScript,
        response,
        duration,
        updatedVariables,
      );

      testResults = scriptResult.results;
      if (scriptResult.variablesChanged) {
        variablesChanged = true;

        updatedVariables = scriptResult.variables;
      }
    }

    // Save environment updates if any
    if (variablesChanged && validEnvironmentId) {
      await this.prisma.environment.update({
        where: { id: validEnvironmentId },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: { variables: updatedVariables as any },
      });
      console.log(
        `[EXECUTION] Updated environment variables for ${validEnvironmentId}`,
      );
    }

    // Save execution

    const execution = await this.prisma.requestExecution.create({
      data: {
        requestId: request.id,
        environmentId: validEnvironmentId,
        status: response.status,
        duration,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        validationResult: validationResult as any,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        testResults: testResults as any,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        response: {
          data: response.data,
          headers: response.headers,
        } as any,
      },
    });

    return execution;
  }

  private runTestScript(
    script: string,
    response: ExecutionResponse,
    duration: number,
    variables: Record<string, unknown> = {},
  ) {
    const results: {
      name: string;
      pass: boolean;
      error?: string;
    }[] = [];
    let variablesChanged = false;
    const currentVariables = { ...variables };
    const ajv = new Ajv({ allErrors: true });

    const jsonData = response.data;

    const createExpect = (actual: any) => {
      const matcher = {
        to: {
          equal: (expected: any) => {
            const pass = JSON.stringify(actual) === JSON.stringify(expected);
            if (!pass)
              throw new Error(
                `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`,
              );
            return matcher;
          },
          be: {
            a: (type: string) => {
              const pass =
                type === 'array'
                  ? Array.isArray(actual)
                  : typeof actual === type;
              if (!pass) throw new Error(`Expected ${actual} to be a ${type}`);
              return matcher;
            },
            an: (type: string) => matcher.to.be.a(type),
            oneOf: (list: any[]) => {
              const pass = list.includes(actual);
              if (!pass)
                throw new Error(
                  `Expected ${actual} to be one of ${JSON.stringify(list)}`,
                );
              return matcher;
            },
            below: (val: number) => {
              const pass = actual < val;
              if (!pass)
                throw new Error(`Expected ${actual} to be below ${val}`);
              return matcher;
            },
          },
          have: {
            property: (prop: string) => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              const pass =
                actual && Object.prototype.hasOwnProperty.call(actual, prop);
              if (!pass)
                throw new Error(`Expected object to have property ${prop}`);
              return matcher;
            },
          },
        },
      };
      return matcher;
    };

    const context = {
      pm: {
        response: {
          status: response.status,
          code: response.status,
          data: response.data,
          headers: response.headers,
          responseTime: duration,
          json: () => jsonData,
          to: {
            have: {
              status: (code: number) => {
                const pass = response.status === code;
                results.push({ name: `Status is ${code}`, pass });
              },

              jsonSchema: (schema: any) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                const validate = ajv.compile(schema);

                const valid = validate(jsonData);
                if (!valid) {
                  throw new Error(
                    `Schema validation failed: ${ajv.errorsText(validate.errors)}`,
                  );
                }
              },
            },
          },
        },
        test: (name: string, fn: () => void) => {
          try {
            fn();
            results.push({ name, pass: true });
          } catch (err: unknown) {
            results.push({
              name,
              pass: false,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        },
        expect: createExpect,
        environment: {
          set: (key: string, value: unknown) => {
            currentVariables[key] = value;
            variablesChanged = true;
          },
          get: (key: string) => currentVariables[key],
        },
      },
      console: {
        log: (...args: unknown[]) => console.log('[Sandbox]', ...args),
      },
    };

    try {
      vm.runInNewContext(script, context, { timeout: 1000 });
    } catch (err: unknown) {
      results.push({
        name: 'Script Error',
        pass: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const finalResults = results.filter(
      (v, i, a) => a.findIndex((t) => t.name === v.name) === i,
    );
    return {
      results: finalResults,
      variables: currentVariables,
      variablesChanged,
    };
  }
}
