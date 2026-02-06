/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { RequestService } from './request.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  request: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  requestExecution: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

describe('RequestService', () => {
  let service: RequestService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RequestService>(RequestService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a request', async () => {
      const dto = {
        name: 'Test',
        method: 'GET',
        url: 'http://test.com',
        projectId: '1',
      };
      const expected = { id: '1', ...dto };
      (prisma.request.create as jest.Mock).mockResolvedValue(expected);

      const result = await service.create(dto);
      expect(result).toEqual(expected);
      expect(prisma.request.create).toHaveBeenCalledWith({ data: dto });
    });
  });

  describe('findAll', () => {
    it('should return requests for a project', async () => {
      const expected = [{ id: '1', name: 'Test' }];
      (prisma.request.findMany as jest.Mock).mockResolvedValue(expected);

      const result = await service.findAll('1');
      expect(result).toEqual(expected);
      expect(prisma.request.findMany).toHaveBeenCalledWith({
        where: { projectId: '1' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a single request', async () => {
      const expected = { id: '1', name: 'Test' };
      (prisma.request.findUnique as jest.Mock).mockResolvedValue(expected);

      const result = await service.findOne('1');
      expect(result).toEqual(expected);
      expect(prisma.request.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });
  });

  describe('update', () => {
    it('should update a request', async () => {
      const dto = { name: 'Updated' };
      const expected = { id: '1', ...dto };
      (prisma.request.update as jest.Mock).mockResolvedValue(expected);

      const result = await service.update('1', dto);
      expect(result).toEqual(expected);
      expect(prisma.request.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: dto,
      });
    });
  });

  describe('remove', () => {
    it('should delete a request', async () => {
      const expected = { id: '1' };
      (prisma.request.delete as jest.Mock).mockResolvedValue(expected);

      const result = await service.remove('1');
      expect(result).toEqual(expected);
      expect(prisma.request.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });
  });

  describe('getProjectHistory', () => {
    it('should return execution history', async () => {
      const expected = [{ id: 'exec-1' }];
      (prisma.requestExecution.findMany as jest.Mock).mockResolvedValue(
        expected,
      );

      const result = await service.getProjectHistory('1');
      expect(result).toEqual(expected);
      expect(prisma.requestExecution.findMany).toHaveBeenCalled();
    });
  });

  describe('clearProjectHistory', () => {
    it('should delete project history', async () => {
      (prisma.requestExecution.deleteMany as jest.Mock).mockResolvedValue({
        count: 5,
      });

      await service.clearProjectHistory('1');
      expect(prisma.requestExecution.deleteMany).toHaveBeenCalledWith({
        where: { request: { projectId: '1' } },
      });
    });
  });
});
