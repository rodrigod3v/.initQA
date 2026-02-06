import { Injectable } from '@nestjs/common';
import Ajv from 'ajv';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContractService {
  private ajv = new Ajv({ allErrors: true });

  constructor(private prisma: PrismaService) {}

  parseSwagger(content: string): Record<string, any> {
    try {
      // Try JSON first
      return JSON.parse(content) as Record<string, any>;
    } catch {
      throw new Error('Invalid Swagger format (neither JSON nor YAML)');
    }
  }

  async syncWithProject(projectId: string, content: string): Promise<unknown> {
    const swagger = this.parseSwagger(content);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const paths = swagger.paths || {};
    const requests: unknown[] = [];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    for (const path of Object.keys(paths)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
      for (const method of Object.keys(paths[path])) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const definition = paths[path][method];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const schema =
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          definition.responses?.['200']?.content?.['application/json']
            ?.schema ||
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              expectedResponseSchema: schema,
            },
          });
        } else {
          request = await this.prisma.request.create({
            data: {
              projectId,
              url: path,
              method: method.toUpperCase(),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              expectedResponseSchema: schema,
            },
          });
        }
        requests.push(request);
      }
    }

    return {
      message: `${requests.length} requests synced successfully`,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      requests: requests as any,
    };
  }

  validate(
    schema: unknown,
    data: unknown,
  ): { valid: boolean; errors?: unknown } {
    if (!schema) return { valid: true };

    const validate = this.ajv.compile(schema);
    const valid = validate(data);

    return {
      valid: !!valid,
      errors: validate.errors,
    };
  }
}
