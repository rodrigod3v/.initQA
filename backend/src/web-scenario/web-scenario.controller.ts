import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { WebScenarioService } from './web-scenario.service';
import { WebExecutionService } from './execution/web-execution.service';
import { CreateWebScenarioDto, UpdateWebScenarioDto } from './dto/web-scenario.dto';

import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('scenarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('web-scenarios')
export class WebScenarioController {
  constructor(
    private readonly webScenarioService: WebScenarioService,
    private readonly webExecutionService: WebExecutionService,
  ) { }

  @ApiOperation({ summary: 'Create a new web scenario' })
  @Post()
  create(@Body() createDto: CreateWebScenarioDto) {
    return this.webScenarioService.create(createDto);
  }

  @Get()
  findAll(@Query('projectId') projectId: string) {
    return this.webScenarioService.findAll(projectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.webScenarioService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateWebScenarioDto) {
    return this.webScenarioService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.webScenarioService.remove(id);
  }

  @ApiOperation({ summary: 'Execute a web scenario' })
  @Post(':id/execute')
  execute(@Param('id') id: string, @Query('environmentId') environmentId?: string) {
    return this.webExecutionService.execute(id, environmentId);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.webExecutionService.getHistory(id);
  }

  @Get('project-history/:projectId')
  getProjectHistory(@Param('projectId') projectId: string) {
    return this.webExecutionService.getProjectHistory(projectId);
  }

  @Delete(':id/history')
  clearHistory(@Param('id') id: string) {
    return this.webExecutionService.clearHistory(id);
  }
}
