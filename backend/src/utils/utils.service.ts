import { Injectable } from '@nestjs/common';
import { faker } from '@faker-js/faker';

@Injectable()
export class UtilsService {
  generateCPF(valid = true): string {
    const rnd = (n: number) => Math.round(Math.random() * n);
    const mod = (n: number, d: number) => Math.round(n - Math.floor(n / d) * d);

    const n = Array.from({ length: 9 }, () => rnd(9));
    let d1 = n.reduce((acc, curr, i) => acc + curr * (10 - i), 0);
    d1 = 11 - mod(d1, 11);
    if (d1 >= 10) d1 = 0;

    const n10 = [...n, d1];
    let d2 = n10.reduce((acc, curr, i) => acc + curr * (11 - i), 0);
    d2 = 11 - mod(d2, 11);
    if (d2 >= 10) d2 = 0;

    if (!valid) {
      // Return something that looks like CPF but is invalid (e.g., wrong last digit)
      return [...n, d1, d2 === 0 ? 1 : 0].join('');
    }

    return [...n, d1, d2].join('');
  }

  generateEmail(): string {
    return faker.internet.email();
  }

  generateUUID(): string {
    return faker.string.uuid();
  }

  generateWord(): string {
    return faker.lorem.word();
  }

  /**
   * Simple Fuzzing: Mutates a JSON by removing a field or changing its type
   */
  generateInvalidPayload(payload: unknown): unknown {
    if (!payload || typeof payload !== 'object') return payload;

    const keys = Object.keys(payload);
    if (keys.length === 0) return payload;

    const mutated = JSON.parse(JSON.stringify(payload)) as Record<
      string,
      unknown
    >;
    const randomKey = keys[Math.floor(Math.random() * keys.length)];

    const action = Math.random();
    if (action < 0.5) {
      // Remove field
      delete mutated[randomKey];
    } else {
      // Change type
      mutated[randomKey] =
        typeof mutated[randomKey] === 'string' ? 123 : 'invalid_string';
    }

    return mutated;
  }

  replaceVariables(
    target: unknown,
    variables: Record<string, unknown>,
  ): unknown {
    if (!target) return target;

    let str = typeof target === 'string' ? target : JSON.stringify(target);

    // Replace user variables
    Object.keys(variables).forEach((key) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      const value = String(variables[key]);
      str = str.replace(placeholder, value);
    });

    // Replace system variables
    str = str.replace(/\{\{\$randomCPF\}\}/g, () => this.generateCPF(true));
    str = str.replace(/\{\{\$randomEmail\}\}/g, () => this.generateEmail());
    str = str.replace(/\{\{\$randomUUID\}\}/g, () => this.generateUUID());
    str = str.replace(/\{\{\$randomWord\}\}/g, () => this.generateWord());

    try {
      return typeof target === 'string' ? str : JSON.parse(str);
    } catch {
      return str;
    }
  }
}
