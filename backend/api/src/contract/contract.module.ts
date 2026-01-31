import { Module } from '@nestjs/common';
import { ContractService } from './contract.service';
import { ContractController } from './contract.controller';

@Module({
  providers: [ContractService],
  exports: [ContractService],
  controllers: [ContractController],
})
export class ContractModule {}
