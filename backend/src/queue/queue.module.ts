import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExecutionProcessor } from './execution.processor';
import { RequestModule } from '../request/request.module';
import { LoadTestModule } from '../load-test/load-test.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'execution',
    }),
    RequestModule,
    LoadTestModule,
  ],
  providers: [ExecutionProcessor],
  exports: [BullModule],
})
export class QueueModule {}
