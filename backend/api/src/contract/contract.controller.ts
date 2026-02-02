import { Controller, Post, Body, UseGuards, Param, Request } from '@nestjs/common';
import { ContractService } from './contract.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('contract')
export class ContractController {
  constructor(
    private contractService: ContractService,
    private prisma: PrismaService,
  ) {}

  @Post('parse')
  async parse(@Body('content') content: string) {
    const swagger = this.contractService.parseSwagger(content);
    return swagger;
  }

  @Post('sync/:projectId')
  async sync(
    @Param('projectId') projectId: string,
    @Body('content') content: string,
  ) {
    const swagger = this.contractService.parseSwagger(content);
    const paths = swagger.paths || {};
    const requests: any[] = [];

    for (const path of Object.keys(paths)) {
      for (const method of Object.keys(paths[path])) {
        const definition = paths[path][method];
        const schema = definition.responses?.['200']?.content?.['application/json']?.schema || 
                       definition.responses?.['200']?.schema;

        // Try to find existing request
        let request = await this.prisma.request.findFirst({
          where: {
            projectId,
            url: path,
            method: method.toUpperCase(),
          },
        });

        if (request) {
          request = await this.prisma.request.update({
            where: { id: request.id },
            data: {
              expectedResponseSchema: schema as any,
            },
          });
        } else {
          request = await this.prisma.request.create({
            data: {
              projectId,
              url: path,
              method: method.toUpperCase(),
              expectedResponseSchema: schema as any,
            },
          });
        }
        requests.push(request);
      }
    }

    return {
      message: `${requests.length} requests synced successfully`,
      requests,
    };
  }
}
