import { Injectable } from '@nestjs/common';
import Ajv from 'ajv';
import * as yaml from 'js-yaml';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContractService {
  private ajv = new Ajv({ allErrors: true });

  constructor(private prisma: PrismaService) { }

  parseSwagger(content: string): any {
    try {
      // Try JSON first
      return JSON.parse(content);
    } catch (e) {
      try {
        // Try YAML
        return yaml.load(content);
      } catch (e2) {
        throw new Error('Invalid Swagger format (neither JSON nor YAML)');
      }
    }
  }

  async syncWithProject(projectId: string, content: string): Promise<any> {
    const swagger = this.parseSwagger(content);
    const paths = swagger.paths || {};
    const requests: any[] = [];

    for (const path of Object.keys(paths)) {
      for (const method of Object.keys(paths[path])) {
        const definition = paths[path][method];
        const schema = definition.responses?.['200']?.content?.['application/json']?.schema ||
          definition.responses?.['200']?.schema;

        // Try to find existing request
        let request = await this.prisma.request.findFirst({
          where: {
            projectId,
            url: path,
            method: method.toUpperCase(),
          },
        });

        if (request) {
          request = await this.prisma.request.update({
            where: { id: request.id },
            data: {
              expectedResponseSchema: schema as any,
            },
          });
        } else {
          request = await this.prisma.request.create({
            data: {
              projectId,
              url: path,
              method: method.toUpperCase(),
              expectedResponseSchema: schema as any,
            },
          });
        }
        requests.push(request);
      }
    }

    return {
      message: `${requests.length} requests synced successfully`,
      requests,
    };
  }

  validate(schema: any, data: any): { valid: boolean; errors?: any } {
    if (!schema) return { valid: true };

    const validate = this.ajv.compile(schema);
    const valid = validate(data);

    return {
      valid: !!valid,
      errors: validate.errors,
    };
  }
}
