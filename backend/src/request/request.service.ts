import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RequestService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    name?: string;
    method: string;
    url: string;
    headers?: Record<string, unknown>;
    body?: unknown;
    projectId: string;
  }) {
    return this.prisma.request.create({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: data as any,
    });
  }

  async findAll(projectId?: string) {
    return this.prisma.request.findMany({
      where: projectId ? { projectId } : {},
    });
  }

  async findOne(id: string) {
    return this.prisma.request.findUnique({
      where: { id },
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      method: string;
      url: string;
      headers: Record<string, unknown>;
      body: unknown;
    }>,
  ) {
    return this.prisma.request.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: data as any,
    });
  }

  async remove(id: string) {
    return this.prisma.request.delete({
      where: { id: id },
    });
  }

  async getProjectHistory(projectId: string) {
    return this.prisma.requestExecution.findMany({
      where: {
        request: {
          projectId,
        },
      },
      include: {
        request: {
          select: {
            name: true,
            method: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async clearProjectHistory(projectId: string) {
    return this.prisma.requestExecution.deleteMany({
      where: {
        request: {
          projectId,
        },
      },
    });
  }
}
