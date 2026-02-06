import { Test, TestingModule } from '@nestjs/testing';
import { UtilsService } from './utils.service';

describe('UtilsService', () => {
  let service: UtilsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UtilsService],
    }).compile();

    service = module.get<UtilsService>(UtilsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateCPF', () => {
    it('should generate a valid CPF', () => {
      const cpf = service.generateCPF(true);
      expect(cpf).toMatch(/^\d{11}$/);
      // We could add full algorithm validation here, but length check is a good start
    });

    it('should generate an invalid CPF', () => {
      const cpf = service.generateCPF(false);
      expect(cpf).toMatch(/^\d{11}$/);
    });
  });

  describe('generateInvalidPayload', () => {
    it('should mutate payload', () => {
      const payload = { name: 'test', age: 30 };
      const mutated = service.generateInvalidPayload(payload);
      expect(mutated).not.toEqual(payload);
    });

    it('should return same if payload is empty', () => {
        const payload = {};
        const mutated = service.generateInvalidPayload(payload);
        expect(mutated).toEqual(payload);
    });
  });

  describe('replaceVariables', () => {
    it('should replace user variables', () => {
      const target = { url: 'http://{{host}}/api' };
      const variables = { host: 'localhost' };
      const result = service.replaceVariables(target, variables);
      expect(result).toEqual({ url: 'http://localhost/api' });
    });

    it('should replace system variables', () => {
      const target = { cpf: '{{$randomCPF}}' };
      const result = service.replaceVariables(target, {});
      expect(result.cpf).toMatch(/^\d{11}$/);
      expect(result.cpf).not.toContain('randomCPF');
    });

    it('should handle string target', () => {
        const target = 'Hello {{name}}';
        const variables = { name: 'World' };
        const result = service.replaceVariables(target, variables);
        expect(result).toBe('Hello World');
    });
  });
});
