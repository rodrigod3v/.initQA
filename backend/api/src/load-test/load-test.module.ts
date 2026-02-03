import { Module } from '@nestjs/common';
import { LoadTestService } from './load-test.service';
import { LoadTestController } from './load-test.controller';
import { LoadExecutionService } from './execution/load-execution.service';
import { UtilsModule } from '../utils/utils.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, UtilsModule],
  controllers: [LoadTestController],
  providers: [LoadTestService, LoadExecutionService],
  exports: [LoadTestService],
})
export class LoadTestModule {}
