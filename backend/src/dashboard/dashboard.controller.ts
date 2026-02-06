import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({ summary: 'Get overall dashboard statistics' })
  @Get('stats')
  getStats() {
    return this.dashboardService.getStats();
  }

  @ApiOperation({ summary: 'Get executive dashboard statistics for a project' })
  @Get('executive/:projectId')
  getExecutiveStats(@Param('projectId') projectId: string) {
    return this.dashboardService.getExecutiveStats(projectId);
  }
}
