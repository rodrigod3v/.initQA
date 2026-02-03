import { Injectable } from '@nestjs/common';
import Ajv from 'ajv';
import * as yaml from 'js-yaml';

@Injectable()
export class ContractService {
  private ajv = new Ajv({ allErrors: true });

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
