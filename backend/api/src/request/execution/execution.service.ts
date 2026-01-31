import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import axios, { AxiosRequestConfig } from 'axios';
import { ContractService } from '../../contract/contract.service';

@Injectable()
export class ExecutionService {
  constructor(
    private prisma: PrismaService,
    private contractService: ContractService,
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

    const startTime = Date.now();
    
    // Replace placeholders in URL, headers, and body
    const url = this.replaceVariables(request.url, variables);
    const headers = this.replaceVariables(request.headers, variables);
    const body = this.replaceVariables(request.body, variables);

    const config: AxiosRequestConfig = {
      method: request.method,
      url,
      headers: headers || {},
      data: body,
      validateStatus: () => true, // Capture all status codes
    };

    try {
      const response = await axios(config);
      const duration = Date.now() - startTime;

      // Validate contract if schema exists
      let validationResult: any = null;
      if (request.expectedResponseSchema) {
        validationResult = this.contractService.validate(
          request.expectedResponseSchema,
          response.data,
        );
      }

      // Save execution
      const execution = await this.prisma.requestExecution.create({
        data: {
          requestId: request.id,
          status: response.status,
          duration,
          validationResult: validationResult as any,
          response: {
            data: response.data,
            headers: response.headers,
          } as any,
        },
      });

      return execution;
    } catch (error) {
      const duration = Date.now() - startTime;
      return this.prisma.requestExecution.create({
        data: {
          requestId: request.id,
          status: error.response?.status || 500,
          duration,
          response: {
            error: error.message,
            data: error.response?.data,
          } as any,
        },
      });
    }
  }

  private replaceVariables(target: any, variables: Record<string, any>): any {
    if (!target) return target;
    
    let str = typeof target === 'string' ? target : JSON.stringify(target);
    
    Object.keys(variables).forEach((key) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      str = str.replace(placeholder, variables[key]);
    });

    try {
      return typeof target === 'string' ? str : JSON.parse(str);
    } catch {
      return str;
    }
  }
}
