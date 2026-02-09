import { Module, forwardRef } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { RequestModule } from '../request/request.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [RequestModule, forwardRef(() => QueueModule)],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
