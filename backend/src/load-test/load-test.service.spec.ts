/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { LoadTestService } from './load-test.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  loadTest: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  loadExecution: {
    deleteMany: jest.fn(),
  },
};

describe('LoadTestService', () => {
  let service: LoadTestService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoadTestService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LoadTestService>(LoadTestService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('create', async () => {
    const dto = { name: 'Load Test', projectId: '1', config: {} };
    const expected = { id: '1', ...dto };
    (prisma.loadTest.create as jest.Mock).mockResolvedValue(expected);

    const result = await service.create(dto);
    expect(result).toEqual(expected);
    expect(prisma.loadTest.create).toHaveBeenCalled();
  });

  it('findAll', async () => {
    const expected = [{ id: '1' }];
    (prisma.loadTest.findMany as jest.Mock).mockResolvedValue(expected);

    const result = await service.findAll('1');
    expect(result).toEqual(expected);
    expect(prisma.loadTest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectId: '1' } }),
    );
  });

  it('delete', async () => {
    (prisma.loadExecution.deleteMany as jest.Mock).mockResolvedValue({});
    (prisma.loadTest.delete as jest.Mock).mockResolvedValue({ id: '1' });

    await service.remove('1');
    expect(prisma.loadExecution.deleteMany).toHaveBeenCalledWith({
      where: { loadTestId: '1' },
    });
    expect(prisma.loadTest.delete).toHaveBeenCalledWith({ where: { id: '1' } });
  });
});
