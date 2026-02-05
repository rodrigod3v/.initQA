import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RequestService } from './request.service';
import { ExecutionService } from './execution/execution.service';
import { ComparisonService } from './comparison/comparison.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateRequestDto, UpdateRequestDto } from './dto/request.dto';
import { CompareRequestsDto } from './dto/compare-requests.dto';

import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('requests')
export class RequestController {
  constructor(
    private readonly requestService: RequestService,
    private readonly executionService: ExecutionService,
    private readonly comparisonService: ComparisonService,
  ) { }

  @ApiOperation({ summary: 'Create a new request' })
  @Post()
  create(@Body() data: CreateRequestDto) {
    return this.requestService.create(data);
  }

  @ApiOperation({ summary: 'Execute a single request' })
  @Post(':id/execute')
  execute(
    @Param('id') id: string,
    @Body('environmentId') environmentId?: string,
  ) {
    return this.executionService.execute(id, environmentId);
  }

  @Post('compare')
  compare(@Body() data: CompareRequestsDto) {
    return this.comparisonService.compare(
      data.requestId,
      data.leftEnvId,
      data.rightEnvId,
    );
  }

  @Get()
  findAll(@Query('projectId') projectId?: string) {
    return this.requestService.findAll(projectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.requestService.findOne(id);
  }

  @Get('project-history/:projectId')
  getProjectHistory(@Param('projectId') projectId: string) {
    return this.requestService.getProjectHistory(projectId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateRequestDto) {
    return this.requestService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.requestService.remove(id);
  }

  @Delete('project-history/:projectId')
  clearProjectHistory(@Param('projectId') projectId: string) {
    return this.requestService.clearProjectHistory(projectId);
  }
}
