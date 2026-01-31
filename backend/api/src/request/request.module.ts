import { Module } from '@nestjs/common';
import { RequestController } from './request.controller';
import { RequestService } from './request.service';
import { ExecutionService } from './execution/execution.service';
import { ComparisonService } from './comparison/comparison.service';

@Module({
  controllers: [RequestController],
  providers: [RequestService, ExecutionService, ComparisonService],
})
export class RequestModule {}
