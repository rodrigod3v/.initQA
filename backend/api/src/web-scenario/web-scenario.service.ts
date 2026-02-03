import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebScenarioService {
  constructor(private prisma: PrismaService) {}

  async create(data: { name: string; projectId: string; steps: any[] }) {
    const { projectId, ...rest } = data;
    return this.prisma.webScenario.create({
      data: {
        ...rest,
        project: { connect: { id: projectId } }
      },
    });
  }

  async findAll(projectId?: string) {
    return this.prisma.webScenario.findMany({
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
    const scenario = await this.prisma.webScenario.findUnique({
      where: { id },
      include: {
        executions: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!scenario) throw new NotFoundException('Scenario not found');
    return scenario;
  }

  async update(id: string, data: any) {
    return this.prisma.webScenario.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    // Delete executions first if not using cascade
    await this.prisma.webExecution.deleteMany({
      where: { scenarioId: id }
    });
    return this.prisma.webScenario.delete({
      where: { id },
    });
  }
}
