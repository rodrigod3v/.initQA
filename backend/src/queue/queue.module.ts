import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExecutionProcessor } from './execution.processor';
import { RequestModule } from '../request/request.module';
import { LoadTestModule } from '../load-test/load-test.module';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'execution',
    }),
    RequestModule,
    forwardRef(() => LoadTestModule),
    forwardRef(() => ProjectModule),
  ],
  providers: [ExecutionProcessor],
  exports: [BullModule],
})
export class QueueModule {}
