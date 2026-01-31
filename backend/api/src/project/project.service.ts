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
}
