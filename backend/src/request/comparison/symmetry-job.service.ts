import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ComparisonService } from './comparison.service';
import axios from 'axios';

@Injectable()
export class SymmetryJobService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SymmetryJobService.name);

  constructor(
    private prisma: PrismaService,
    private comparisonService: ComparisonService,
  ) {}

  onApplicationBootstrap() {
    // Basic polling worker - Runs every minute to check for scheduled jobs
    // In a production app, we would use @nestjs/schedule (cron)
    setInterval(() => this.runScheduledChecks(), 60000);
    this.logger.log('Symmetry Job Worker initialized (1min polling)');
  }

  async runScheduledChecks() {
    const checks = await this.prisma.symmetryCheck.findMany({
      where: { enabled: true },
    });

    for (const check of checks) {
      if (this.shouldRunCheck(check)) {
        await this.executeCheck(check);
      }
    }
  }

  private shouldRunCheck(check: any): boolean {
    if (!check.lastCheckedAt) return true;
    
    // Simple heuristic: if it was checked more than 55 minutes ago (for hourly "0 * * * *")
    // This is a simplified cron logic for this environment
    const now = new Date();
    const diffMs = now.getTime() - new Date(check.lastCheckedAt).getTime();
    
    if (check.cron === '0 * * * *') return diffMs >= 3600000; // Hourly
    if (check.cron === '*/15 * * * *') return diffMs >= 900000; // 15 mins
    return diffMs >= 86400000; // Default Daily
  }

  private async executeCheck(check: any) {
    this.logger.log(`Executing Symmetry Check: ${check.name}`);
    
    try {
      const result = await this.comparisonService.compare(
        check.requestId,
        check.sourceEnvId,
        check.targetEnvId,
        [], // Potential for saved masking keys per check later
      );

      const status = result.delta ? 'DRIFT' : 'SYNC';
      
      await this.prisma.symmetryCheck.update({
        where: { id: check.id },
        data: {
          lastResult: status,
          lastCheckedAt: new Date(),
        },
      });

      if (status === 'DRIFT' && check.webhookUrl) {
        await this.sendAlert(check, result.delta);
      }
    } catch (error) {
      this.logger.error(`Symmetry Check failed for ${check.name}: ${error.message}`);
    }
  }

  private async sendAlert(check: any, delta: any) {
    const message = {
      text: `🔬 *Symmetry Violation Detected!* \nScenario: *${check.name}* \nResult: Structural Drift between selected environments.`,
      attachments: [
        {
          color: '#f43f5e',
          title: 'Drift Details',
          text: 'The API contracts no longer match. Immediate investigation required.',
          fields: [
            { title: 'Project', value: check.projectId, short: true },
            { title: 'Source Env', value: check.sourceEnvId, short: true },
            { title: 'Target Env', value: check.targetEnvId, short: true }
          ]
        }
      ]
    };

    try {
      await axios.post(check.webhookUrl, message);
      this.logger.log(`Alert sent to webhook for ${check.name}`);
    } catch (err) {
      this.logger.error(`Failed to send webhook alert: ${err.message}`);
    }
  }
}
