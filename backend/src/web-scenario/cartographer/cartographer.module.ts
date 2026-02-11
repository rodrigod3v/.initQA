import { Module } from '@nestjs/common';
import { CartographerService } from './cartographer.service';
import { OracleService } from './oracle.service';
import { CartographerController } from './cartographer.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CartographerService, OracleService],
  controllers: [CartographerController],
  exports: [CartographerService, OracleService],
})
export class CartographerModule {}
