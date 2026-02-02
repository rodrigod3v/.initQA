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
  ) {}

  async execute(requestId: string, environmentId?: string) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error('Request not found');
    }

    let variables = {};
    if (environmentId) {
      const environment = await this.prisma.environment.findUnique({
        where: { id: environmentId },
      });
      variables = (environment?.variables as any) || {};
    }

    // Replace placeholders in URL, headers, and body
    const url = this.replaceVariables(request.url, variables);
    const headers = this.replaceVariables(request.headers, variables);
    const body = this.replaceVariables(request.body, variables);

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
          method: request.method,
          url,
          headers: finalHeaders,
          data: body,
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
    if (request.testScript) {
      testResults = this.runTestScript(request.testScript, response, duration);
    }

    // Save execution
    const execution = await this.prisma.requestExecution.create({
      data: {
        requestId: request.id,
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

  private runTestScript(script: string, response: any, duration: number) {
    const results: any[] = [];
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
        expect: createExpect
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

    return results.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i);
  }

  private replaceVariables(target: any, variables: Record<string, any>): any {
    if (!target) return target;
    
    let str = typeof target === 'string' ? target : JSON.stringify(target);
    
    // Replace user variables
    Object.keys(variables).forEach((key) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      str = str.replace(placeholder, variables[key]);
    });

    // Replace system variables
    str = str.replace(/\{\{\$randomCPF\}\}/g, () => this.utilsService.generateCPF(true));
    str = str.replace(/\{\{\$randomEmail\}\}/g, () => this.utilsService.generateEmail());
    str = str.replace(/\{\{\$randomUUID\}\}/g, () => this.utilsService.generateUUID());
    str = str.replace(/\{\{\$randomWord\}\}/g, () => this.utilsService.generateWord());

    try {
      return typeof target === 'string' ? str : JSON.parse(str);
    } catch {
      return str;
    }
  }
}
