import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProjectModule } from './project/project.module';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { RequestModule } from './request/request.module';

@Module({
  imports: [ProjectModule, PrismaModule, RequestModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
