import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExecutionService } from '../request/execution/execution.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface RunResult {
  id: string;
  name: string;
  status: number;
  duration: number;
  success: boolean;
}

@Injectable()
export class ProjectService {
  constructor(
    private prisma: PrismaService,
    private executionService: ExecutionService,
    @InjectQueue('execution') private executionQueue: Queue,
  ) {}

  async runAllAsync(projectId: string, environmentId?: string) {
    return this.executionQueue.add('batch-execution', {
      projectId,
      environmentId,
    });
  }

  async create(data: { name: string }) {
    return this.prisma.project.create({
      data,
    });
  }

  async findAll() {
    return this.prisma.project.findMany({
      include: {
        environments: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
      include: {
        environments: true,
      },
    });
  }

  async remove(id: string) {
    await this.prisma.request.deleteMany({ where: { projectId: id } });
    await this.prisma.environment.deleteMany({ where: { projectId: id } });
    return this.prisma.project.delete({
      where: { id },
    });
  }

  async getEnvironments(projectId: string) {
    return this.prisma.environment.findMany({
      where: { projectId },
    });
  }

  async createEnvironment(
    projectId: string,
    data: { name: string; variables?: any },
  ) {
    return this.prisma.environment.create({
      data: {
        ...data,
        projectId,
      },
    });
  }

  async removeEnvironment(id: string) {
    return this.prisma.environment.delete({
      where: { id },
    });
  }

  async runAll(projectId: string, environmentId?: string) {
    const requests = await this.prisma.request.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    const results: RunResult[] = [];
    for (const request of requests) {
      const result = await this.executionService.execute(
        request.id,
        environmentId,
      );
      results.push({
        id: request.id,
        name: request.name ?? '',
        status: result.status,
        duration: result.duration,
        success: result.status >= 200 && result.status < 300,
      });
    }

    return {
      projectId,
      total: requests.length,
      passed: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }
}
