import {
  Injectable,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LoadTestService implements OnModuleInit {
  private readonly logger = new Logger(LoadTestService.name);
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    const execAsync = promisify(exec);
    try {
      const { stdout } = await execAsync('k6 version');
      this.logger.log(`✅ K6 binary found: ${stdout.trim()}`);
    } catch {
      this.logger.warn(
        '⚠️ K6 binary NOT FOUND. Load tests will fail. Please install k6 (https://k6.io).',
      );
    }
  }

  async create(data: {
    name: string;
    projectId: string;
    config: Record<string, unknown>;
  }) {
    const { projectId, ...rest } = data;
    return this.prisma.loadTest.create({
      data: {
        ...rest,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        config: rest.config as any,
        project: { connect: { id: projectId } },
      },
    });
  }

  async findAll(projectId?: string) {
    return this.prisma.loadTest.findMany({
      where: projectId ? { projectId } : {},
      include: {
        _count: {
          select: { executions: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const test = (await this.prisma.loadTest.findUnique({
      where: { id },
      include: {
        executions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    })) as any;

    if (!test) throw new NotFoundException('Load test not found');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return test;
  }

  async update(id: string, data: any) {
    return await this.prisma.loadTest.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      data: { config: data.config },
    });
  }

  async remove(id: string) {
    await this.prisma.loadExecution.deleteMany({
      where: { loadTestId: id },
    });
    return this.prisma.loadTest.delete({
      where: { id },
    });
  }
}
