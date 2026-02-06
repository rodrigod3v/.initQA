import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { UtilsService } from './utils.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('utils')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('utils')
export class UtilsController {
  constructor(private utilsService: UtilsService) {}

  @ApiOperation({ summary: 'Generate a random valid/invalid CPF' })
  @Get('generate/cpf')
  generateCPF(@Query('valid') valid?: string) {
    return { cpf: this.utilsService.generateCPF(valid !== 'false') };
  }

  @ApiOperation({ summary: 'Generate a random email' })
  @Get('generate/email')
  generateEmail() {
    return { email: this.utilsService.generateEmail() };
  }

  @ApiOperation({ summary: 'Generate a random UUID' })
  @Get('generate/uuid')
  generateUUID() {
    return { uuid: this.utilsService.generateUUID() };
  }

  @ApiOperation({ summary: 'Generate an invalid payload from a prototype' })
  @Post('generate/invalid-payload')
  generateInvalidPayload(@Body() payload: any) {
    return this.utilsService.generateInvalidPayload(payload);
  }
}
