import { Test, TestingModule } from '@nestjs/testing';
import { WebScenarioService } from './web-scenario.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  webScenario: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  webExecution: {
    deleteMany: jest.fn(),
  },
};

describe('WebScenarioService', () => {
  let service: WebScenarioService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebScenarioService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WebScenarioService>(WebScenarioService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('create', async () => {
    const dto = { name: 'Scenario', projectId: '1', steps: [] };
    const expected = { id: '1', ...dto };
    (prisma.webScenario.create as jest.Mock).mockResolvedValue(expected);

    const result = await service.create(dto);
    expect(result).toEqual(expected);
    expect(prisma.webScenario.create).toHaveBeenCalled();
  });

  it('findAll', async () => {
    const expected = [{ id: '1' }];
    (prisma.webScenario.findMany as jest.Mock).mockResolvedValue(expected);

    const result = await service.findAll('1');
    expect(result).toEqual(expected);
    expect(prisma.webScenario.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { projectId: '1' } }));
  });

  it('delete', async () => {
    (prisma.webExecution.deleteMany as jest.Mock).mockResolvedValue({});
    (prisma.webScenario.delete as jest.Mock).mockResolvedValue({ id: '1' });

    await service.remove('1');
    expect(prisma.webExecution.deleteMany).toHaveBeenCalledWith({ where: { scenarioId: '1' } });
    expect(prisma.webScenario.delete).toHaveBeenCalledWith({ where: { id: '1' } });
  });
});
