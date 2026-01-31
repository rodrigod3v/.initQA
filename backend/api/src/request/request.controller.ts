import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RequestService } from './request.service';
import { ExecutionService } from './execution/execution.service';
import { ComparisonService } from './comparison/comparison.service';

@Controller('requests')
export class RequestController {
  constructor(
    private readonly requestService: RequestService,
    private readonly executionService: ExecutionService,
    private readonly comparisonService: ComparisonService,
  ) {}

  @Post()
  create(
    @Body()
    data: {
      method: string;
      url: string;
      headers?: any;
      body?: any;
      projectId: string;
    },
  ) {
    return this.requestService.create(data);
  }

  @Post(':id/execute')
  execute(
    @Param('id') id: string,
    @Body('environmentId') environmentId?: string,
  ) {
    return this.executionService.execute(id, environmentId);
  }

  @Post(':id/compare')
  compare(
    @Param('id') id: string,
    @Body('environmentIds') environmentIds: string[],
  ) {
    return this.comparisonService.compareEnvironments(id, environmentIds);
  }

  @Get()
  findAll(@Query('projectId') projectId?: string) {
    return this.requestService.findAll(projectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.requestService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.requestService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.requestService.remove(id);
  }
}
