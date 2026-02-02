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
      include: {
        executions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
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
      where: { id },
    });
  }
}
