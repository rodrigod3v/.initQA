import { Module } from '@nestjs/common';
import { WebScenarioService } from './web-scenario.service';
import { WebScenarioController } from './web-scenario.controller';
import { WebExecutionService } from './execution/web-execution.service';
import { WebScenarioRecorderService } from './web-scenario-recorder.service';
import { UtilsModule } from '../utils/utils.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CartographerModule } from './cartographer/cartographer.module';

@Module({
  imports: [PrismaModule, UtilsModule, CartographerModule],
  controllers: [WebScenarioController],
  providers: [
    WebScenarioService,
    WebExecutionService,
    WebScenarioRecorderService,
  ],
  exports: [WebScenarioService],
})
export class WebScenarioModule {}
