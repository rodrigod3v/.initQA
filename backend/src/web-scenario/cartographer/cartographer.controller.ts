import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { CartographerService } from './cartographer.service';

@Controller('cartographer')
export class CartographerController {
  constructor(private readonly cartographerService: CartographerService) {}

  @Post('map')
  async mapSite(@Body() body: { projectId: string; url: string }) {
    return this.cartographerService.mapTopology(body.projectId, body.url);
  }

  @Get('generate-script/:projectId')
  async generateScript(@Param('projectId') projectId: string) {
    return this.cartographerService.generateOracleScript(projectId);
  }

  @Get('generate-json/:projectId')
  async generateJSON(@Param('projectId') projectId: string) {
    return this.cartographerService.generateOracleJSON(projectId);
  }
}
