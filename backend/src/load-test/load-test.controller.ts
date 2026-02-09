import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LoadTestService } from './load-test.service';
import { LoadExecutionService } from './execution/load-execution.service';
import { CreateLoadTestDto, UpdateLoadTestDto } from './dto/load-test.dto';

import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { EventsGateway } from '../events/events.gateway';

@ApiTags('load-tests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('load-tests')
export class LoadTestController {
  constructor(
    private readonly loadTestService: LoadTestService,
    private readonly loadExecutionService: LoadExecutionService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  @ApiOperation({ summary: 'Create a new load test' })
  @Post()
  create(@Body() createDto: CreateLoadTestDto) {
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
  update(@Param('id') id: string, @Body() updateDto: UpdateLoadTestDto) {
    return this.loadTestService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.loadTestService.remove(id);
  }

  @ApiOperation({ summary: 'Execute a load test (queued)' })
  @Post(':id/execute')
  execute(
    @Param('id') id: string,
    @Query('environmentId') environmentId?: string,
  ) {
    return this.loadExecutionService.executeAsync(id, environmentId);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.loadExecutionService.getHistory(id);
  }

  @Delete(':id/history')
  clearHistory(@Param('id') id: string) {
    return this.loadExecutionService.clearHistory(id);
  }

  @Post(':id/stream')
  streamMetrics(@Param('id') id: string, @Body() metrics: any) {
    // Broadcast metrics to frontend via WebSockets
    this.eventsGateway.emitLoadMetrics(id, metrics);
    return { success: true };
  }
}
