import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { BullModule } from '@nestjs/bullmq';
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
import { WebScenarioModule } from './web-scenario/web-scenario.module';
import { LoadTestModule } from './load-test/load-test.module';
import { QueueModule } from './queue/queue.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty' }
            : undefined,
      },
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    ProjectModule,
    PrismaModule,
    RequestModule,
    AuthModule,
    ContractModule,
    UtilsModule,
    DashboardModule,
    WebScenarioModule,
    LoadTestModule,
    LoadTestModule,
    QueueModule,
    EventsModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
