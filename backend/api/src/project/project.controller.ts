import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ProjectService } from './project.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
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

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectService.remove(id);
  }

  @Get(':id/environments')
  getEnvironments(@Param('id') projectId: string) {
    return this.projectService.getEnvironments(projectId);
  }

  @Post(':id/environments')
  createEnvironment(@Param('id') projectId: string, @Body() data: any) {
    return this.projectService.createEnvironment(projectId, data);
  }

  @Delete('environments/:id')
  removeEnvironment(@Param('id') id: string) {
    return this.projectService.removeEnvironment(id);
  }
}
