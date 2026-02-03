import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { LoadTestService } from './load-test.service';
import { LoadExecutionService } from './execution/load-execution.service';

@Controller('load-tests')
export class LoadTestController {
  constructor(
    private readonly loadTestService: LoadTestService,
    private readonly loadExecutionService: LoadExecutionService,
  ) {}

  @Post()
  create(@Body() createDto: { name: string; projectId: string; config: any }) {
    return this.loadTestService.create(createDto);
  }

  @Get()
  findAll(@Query('projectId') projectId: string) {
    return this.loadTestService.findAll(projectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.loadTestService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.loadTestService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.loadTestService.remove(id);
  }

  @Post(':id/execute')
  execute(@Param('id') id: string, @Query('environmentId') environmentId?: string) {
    return this.loadExecutionService.execute(id, environmentId);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.loadExecutionService.getHistory(id);
  }

  @Delete(':id/history')
  clearHistory(@Param('id') id: string) {
    return this.loadExecutionService.clearHistory(id);
  }
}
