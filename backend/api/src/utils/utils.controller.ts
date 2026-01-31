import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { UtilsService } from './utils.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('utils')
export class UtilsController {
  constructor(private utilsService: UtilsService) {}

  @Get('generate/cpf')
  generateCPF(@Query('valid') valid?: string) {
    return { cpf: this.utilsService.generateCPF(valid !== 'false') };
  }

  @Get('generate/email')
  generateEmail() {
    return { email: this.utilsService.generateEmail() };
  }

  @Get('generate/uuid')
  generateUUID() {
    return { uuid: this.utilsService.generateUUID() };
  }

  @Post('generate/invalid-payload')
  generateInvalidPayload(@Body() payload: any) {
    return this.utilsService.generateInvalidPayload(payload);
  }
}
