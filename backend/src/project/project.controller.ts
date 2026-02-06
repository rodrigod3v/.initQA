import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ProjectService } from './project.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) { }

  @ApiOperation({ summary: 'Create a new project' })
  @Post()
  create(@Body() data: CreateProjectDto) {
    return this.projectService.create(data);
  }

  @Get()
  findAll() {
    return this.projectService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectService.findOne(id);
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
  createEnvironment(@Param('id') projectId: string, @Body() data: CreateEnvironmentDto) {
    return this.projectService.createEnvironment(projectId, data);
  }

  @Delete('environments/:id')
  removeEnvironment(@Param('id') id: string) {
    return this.projectService.removeEnvironment(id);
  }

  @ApiOperation({ summary: 'Run all requests in a project' })
  @Post(':id/run-all')
  runAll(
    @Param('id') id: string,
    @Body('environmentId') environmentId?: string,
  ) {
    return this.projectService.runAll(id, environmentId);
  }
}
