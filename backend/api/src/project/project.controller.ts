import { Body, Controller, Get, Post } from '@nestjs/common';
import { ProjectService } from './project.service';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  create(@Body() data: { name: string }) {
    return this.projectService.create(data);
  }

  @Get()
  findAll() {
    return this.projectService.findAll();
  }
}
