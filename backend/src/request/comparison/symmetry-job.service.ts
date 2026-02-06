import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ComparisonService } from './comparison.service';
import axios from 'axios';

interface SymmetryCheckRecord {
  id: string;
  name: string;
  requestId: string;
  sourceEnvId: string;
  targetEnvId: string;
  cron: string;
  webhookUrl: string | null;
  enabled: boolean;
  lastCheckedAt: Date | null;
  lastResult: string | null;
  projectId: string;
}

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
    setInterval(() => {
      this.runScheduledChecks().catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Error in scheduled checks: ${message}`);
      });
    }, 60000);
    this.logger.log('Symmetry Job Worker initialized (1min polling)');
  }

  async runScheduledChecks() {
    // We use dynamic access to bypass linting if Prisma client hasn't been regenerated yet
    const prismaAny = this.prisma as unknown as Record<
      string,
      {
        findMany: (args: any) => Promise<any[]>;
        update: (args: any) => Promise<any>;
      }
    >;
    if (!prismaAny.symmetryCheck) {
      this.logger.warn(
        'SymmetryCheck model not found in Prisma client. Skipping checks.',
      );
      return;
    }

    const checks = (await prismaAny.symmetryCheck.findMany({
      where: { enabled: true },
    })) as unknown as SymmetryCheckRecord[];

    for (const check of checks) {
      if (this.shouldRunCheck(check)) {
        await this.executeCheck(check);
      }
    }
  }

  private shouldRunCheck(check: SymmetryCheckRecord): boolean {
    if (!check.lastCheckedAt) return true;

    // Simple heuristic: if it was checked more than 55 minutes ago (for hourly "0 * * * *")
    const now = new Date();
    const diffMs = now.getTime() - new Date(check.lastCheckedAt).getTime();

    if (check.cron === '0 * * * *') return diffMs >= 3600000; // Hourly
    if (check.cron === '*/15 * * * *') return diffMs >= 900000; // 15 mins
    return diffMs >= 86400000; // Default Daily
  }

  private async executeCheck(check: SymmetryCheckRecord) {
    this.logger.log(`Executing Symmetry Check: ${check.name}`);

    try {
      const result = await this.comparisonService.compare(
        check.requestId,
        check.sourceEnvId,
        check.targetEnvId,
        [], // Potential for saved masking keys per check later
      );

      const status = result.delta ? 'DRIFT' : 'SYNC';

      const prismaAny = this.prisma as unknown as Record<
        string,
        { update: (args: any) => Promise<any> }
      >;
      await prismaAny.symmetryCheck.update({
        where: { id: check.id },
        data: {
          lastResult: status,
          lastCheckedAt: new Date(),
        },
      });

      if (status === 'DRIFT' && check.webhookUrl) {
        await this.sendAlert(check, result.delta);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Symmetry Check failed for ${check.name}: ${message}`);
    }
  }

  private async sendAlert(check: SymmetryCheckRecord, delta: unknown) {
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
            { title: 'Target Env', value: check.targetEnvId, short: true },
          ],
        },
      ],
      delta, // Including delta for context
    };

    try {
      if (check.webhookUrl) {
        await axios.post(check.webhookUrl, message);
        this.logger.log(`Alert sent to webhook for ${check.name}`);
      }
    } catch (err: unknown) {
      const messageStr = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send webhook alert: ${messageStr}`);
    }
  }
}
