import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}

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

  async remove(id: string) {
    // Delete all linked requests and environments first (Prisma might handle this via cascades if configured, but let's be safe if not)
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

  async createEnvironment(projectId: string, data: any) {
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
}
