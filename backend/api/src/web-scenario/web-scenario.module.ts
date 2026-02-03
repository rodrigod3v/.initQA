import { Module } from '@nestjs/common';
import { WebScenarioService } from './web-scenario.service';
import { WebScenarioController } from './web-scenario.controller';
import { WebExecutionService } from './execution/web-execution.service';
import { UtilsModule } from '../utils/utils.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, UtilsModule],
  controllers: [WebScenarioController],
  providers: [WebScenarioService, WebExecutionService],
  exports: [WebScenarioService],
})
export class WebScenarioModule {}
