import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { RequestModule } from '../request/request.module';

@Module({
  imports: [RequestModule],
  controllers: [ProjectController],
  providers: [ProjectService]
})
export class ProjectModule {}
