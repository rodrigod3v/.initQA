import { Module, forwardRef } from '@nestjs/common';
import { LoadTestService } from './load-test.service';
import { LoadTestController } from './load-test.controller';
import { LoadExecutionService } from './execution/load-execution.service';
import { UtilsModule } from '../utils/utils.module';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [PrismaModule, UtilsModule, forwardRef(() => QueueModule)],
  controllers: [LoadTestController],
  providers: [LoadTestService, LoadExecutionService],
  exports: [LoadTestService, LoadExecutionService],
})
export class LoadTestModule {}
