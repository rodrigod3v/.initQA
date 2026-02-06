import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';
import { ContractService } from '../../contract/contract.service';
import { UtilsService } from '../../utils/utils.service';

@Injectable()
export class ExecutionService {
  constructor(
    private prisma: PrismaService,
    private contractService: ContractService,
    private utilsService: UtilsService,
  ) { }

  async execute(requestId: string, environmentId?: string) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error('Request not found');
    }

    let variables = {};
    let validEnvironmentId: string | null = null;

    if (environmentId) {
      const environment = await this.prisma.environment.findUnique({
        where: { id: environmentId },
      });
      if (environment) {
        validEnvironmentId = environment.id;
        variables = (environment.variables as any) || {};
      }
    }

    // Replace placeholders in URL, headers, and body
    const url = this.utilsService.replaceVariables(request.url, variables);
    const headers = this.utilsService.replaceVariables(request.headers, variables);
    const body = this.utilsService.replaceVariables(request.body, variables);

    // Handle Protocol specific logic
    let effectiveMethod = request.method;
    let effectiveBody = body;
    const isGraphQL = (request as any).protocol === 'GRAPHQL';

    if (isGraphQL) {
      effectiveMethod = 'POST';
      // If it's a string, try to wrap it in a GQL payload if it's not already
      if (typeof effectiveBody === 'string') {
        try {
          const parsed = JSON.parse(effectiveBody);
          if (!parsed.query) {
            effectiveBody = { query: effectiveBody };
          }
        } catch (e) {
          effectiveBody = { query: effectiveBody };
        }
      } else if (effectiveBody && !effectiveBody.query) {
        effectiveBody = { query: JSON.stringify(effectiveBody) };
      }
    }

    // Build final headers object
    const finalHeaders = {
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'initQA-System-Agent/1.0',
      ...(headers || {}),
    };

    // Auto-set Content-Type if body exists and not explicitly set
    if (body && !finalHeaders['Content-Type'] && !finalHeaders['content-type']) {
      finalHeaders['Content-Type'] = 'application/json';
    }

    let attempts = 0;
    const maxAttempts = request.method === 'GET' ? 3 : 1;
    let response: any;
    const startTime = Date.now();

    while (attempts < maxAttempts) {
      attempts++;
      try {
        console.log(`[EXECUTION] [${request.method}] Attempt ${attempts}/${maxAttempts} for ${url}`);

        response = await axios({
          method: effectiveMethod,
          url,
          headers: finalHeaders,
          data: effectiveBody,
          timeout: 30000, // 30 seconds timeout
          validateStatus: () => true, // Capture all status codes
        });

        break;
      } catch (error) {
        const isNetworkError = error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT';
        if (attempts >= maxAttempts || !isNetworkError) {
          console.error(`[EXECUTION] [ERROR] ${url}: ${error.message}`);

          const duration = Date.now() - startTime;
          return await this.prisma.requestExecution.create({
            data: {
              requestId: request.id,
              environmentId: validEnvironmentId,
              status: error.code === 'ETIMEDOUT' ? 408 : 500,
              duration,
              response: {
                error: 'EXECUTION_FAILED',
                message: error.message,
                code: error.code,
                attempts
              } as any,
            },
          });
        }
        console.warn(`[EXECUTION] [RETRY] Failed attempt ${attempts} for ${url}. Error: ${error.code}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[EXECUTION] [SUCCESS] ${url} returned ${response.status} in ${duration}ms`);

    // Validate contract if schema exists
    let validationResult: any = null;
    if (request.expectedResponseSchema) {
      validationResult = this.contractService.validate(
        request.expectedResponseSchema,
        response.data,
      );
    }

    // RUN TEST SCRIPTS
    let testResults: any[] | null = null;
    let updatedVariables = { ...variables };
    let variablesChanged = false;

    if (request.testScript) {
      const scriptResult = this.runTestScript(request.testScript, response, duration, updatedVariables);
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
        data: { variables: updatedVariables as any },
      });
      console.log(`[EXECUTION] Updated environment variables for ${validEnvironmentId}`);
    }

    // Save execution
    const execution = await this.prisma.requestExecution.create({
      data: {
        requestId: request.id,
        environmentId: validEnvironmentId,
        status: response.status,
        duration,
        validationResult: validationResult as any,
        testResults: testResults as any,
        response: {
          data: response.data,
          headers: response.headers,
        } as any,
      },
    });

    return execution;
  }

  private runTestScript(script: string, response: any, duration: number, variables: any = {}) {
    const results: any[] = [];
    let variablesChanged = false;
    const currentVariables = { ...variables };
    const vm = require('vm');
    const Ajv = require('ajv');
    const ajv = new Ajv({ allErrors: true });

    const jsonData = response.data;
    const responseTime = 100; // Mock or calculate if needed, though service already has duration

    const createExpect = (actual: any) => {
      const matcher = {
        to: {
          equal: (expected: any) => {
            const pass = JSON.stringify(actual) === JSON.stringify(expected);
            if (!pass) throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
            return matcher;
          },
          be: {
            a: (type: string) => {
              const pass = (type === 'array') ? Array.isArray(actual) : typeof actual === type;
              if (!pass) throw new Error(`Expected ${actual} to be a ${type}`);
              return matcher;
            },
            an: (type: string) => matcher.to.be.a(type),
            oneOf: (list: any[]) => {
              const pass = list.includes(actual);
              if (!pass) throw new Error(`Expected ${actual} to be one of ${JSON.stringify(list)}`);
              return matcher;
            },
            below: (val: number) => {
              const pass = actual < val;
              if (!pass) throw new Error(`Expected ${actual} to be below ${val}`);
              return matcher;
            }
          },
          have: {
            property: (prop: string) => {
              const pass = actual && Object.prototype.hasOwnProperty.call(actual, prop);
              if (!pass) throw new Error(`Expected object to have property ${prop}`);
              return matcher;
            }
          }
        }
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
                const validate = ajv.compile(schema);
                const valid = validate(jsonData);
                if (!valid) {
                  throw new Error(`Schema validation failed: ${ajv.errorsText(validate.errors)}`);
                }
              }
            }
          }
        },
        test: (name: string, fn: Function) => {
          try {
            fn();
            results.push({ name, pass: true });
          } catch (err) {
            results.push({ name, pass: false, error: err.message });
          }
        },
        expect: createExpect,
        environment: {
          set: (key: string, value: any) => {
            currentVariables[key] = value;
            variablesChanged = true;
          },
          get: (key: string) => currentVariables[key]
        }
      },
      console: {
        log: (...args: any[]) => console.log('[Sandbox]', ...args)
      }
    };

    try {
      vm.runInNewContext(script, context, { timeout: 1000 });
    } catch (err) {
      results.push({ name: 'Script Error', pass: false, error: err.message });
    }

    const finalResults = results.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i);
    return {
      results: finalResults,
      variables: currentVariables,
      variablesChanged
    };
  }

}
