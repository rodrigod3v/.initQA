import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RequestService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    name?: string;
    method: string;
    url: string;
    headers?: any;
    body?: any;
    projectId: string;
  }) {
    return this.prisma.request.create({
      data,
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

  async update(id: string, data: any) {
    return this.prisma.request.update({
      where: { id },
      data,
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
