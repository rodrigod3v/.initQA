import { Controller, Post, Body, UseGuards, Param } from '@nestjs/common';
import { ContractService } from './contract.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SyncContractDto } from './dto/contract.dto';

import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('contract')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contract')
export class ContractController {
  constructor(private contractService: ContractService) {}

  @ApiOperation({ summary: 'Parse a Swagger/OpenAPI definition' })
  @Post('parse')
  parse(@Body('content') content: string) {
    return this.contractService.parseSwagger(content);
  }

  @ApiOperation({ summary: 'Sync project requests with a Swagger definition' })
  @Post('sync/:projectId')
  async sync(
    @Param('projectId') projectId: string,
    @Body() data: SyncContractDto,
  ) {
    return this.contractService.syncWithProject(projectId, data.content);
  }
}
