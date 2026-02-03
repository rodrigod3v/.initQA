import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProjectModule } from './project/project.module';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { RequestModule } from './request/request.module';
import { AuthModule } from './auth/auth.module';
import { ContractModule } from './contract/contract.module';
import { UtilsModule } from './utils/utils.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [ProjectModule, PrismaModule, RequestModule, AuthModule, ContractModule, UtilsModule, DashboardModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
