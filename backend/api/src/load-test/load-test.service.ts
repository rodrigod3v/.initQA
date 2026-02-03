import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LoadTestService {
  constructor(private prisma: PrismaService) {}

  async create(data: { name: string; projectId: string; config: any }) {
    const { projectId, ...rest } = data;
    return this.prisma.loadTest.create({
      data: {
        ...rest,
        project: { connect: { id: projectId } }
      },
    });
  }

  async findAll(projectId?: string) {
    return this.prisma.loadTest.findMany({
      where: projectId ? { projectId } : {},
      include: {
        _count: {
          select: { executions: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async findOne(id: string) {
    const test = await this.prisma.loadTest.findUnique({
      where: { id },
      include: {
        executions: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!test) throw new NotFoundException('Load test not found');
    return test;
  }

  async update(id: string, data: any) {
    return this.prisma.loadTest.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.prisma.loadExecution.deleteMany({
      where: { loadTestId: id }
    });
    return this.prisma.loadTest.delete({
      where: { id },
    });
  }
}
