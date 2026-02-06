import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { UtilsService } from '../../utils/utils.service';

const execAsync = promisify(exec);

@Injectable()
export class LoadExecutionService {
  constructor(
    private prisma: PrismaService,
    private utilsService: UtilsService,
  ) {}

  async execute(loadTestId: string, environmentId?: string) {
    console.log(
      `[LoadExecution] Executing test ${loadTestId} with env ${environmentId}`,
    );
    const test = await this.prisma.loadTest.findUnique({
      where: { id: loadTestId },
    });

    if (!test) throw new NotFoundException('Load test not found');

    const variables =
      (environmentId
        ? (
            await this.prisma.environment.findUnique({
              where: { id: environmentId },
            })
          )?.variables
        : {}) || {};
    const config = test.config as Record<string, unknown>;
    const targetUrl = this.utilsService.replaceVariables(
      String(config.targetUrl),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      variables as any,
    ) as string;
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'initqa-k6-'));
    const scriptPath = path.join(tempDir, 'script.js');
    const outputPath = path.join(tempDir, 'output.json');

    // Generate k6 script
    const scriptContent = `
import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  stages: ${JSON.stringify(config.stages || [{ duration: '30s', target: 20 }])},
  thresholds: {
    http_req_duration: [\`p(95)<\${String(config.thresholdMs || '500')}\`],
  },
};

export default function () {
  http.get('${targetUrl}');
  sleep(1);
}
    `;

    fs.writeFileSync(scriptPath, scriptContent);

    const startTime = Date.now();
    let status = 'FINISHED';
    let results: any = null;

    try {
      // Execute k6 with summary exported to JSON
      // Note: This requires k6 to be installed on the system
      const { stdout, stderr } = await execAsync(
        `k6 run --summary-export=${outputPath} ${scriptPath}`,
      );

      if (fs.existsSync(outputPath)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        results = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      } else {
        results = { rawOutput: stdout, errorOutput: stderr };
      }
    } catch (err: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const errorMsg = String(err.message || '');
      status = 'CRASHED';
      let errorDisplay = errorMsg;
      if (errorMsg.includes('not recognized') || errorMsg.includes('enoent')) {
        errorDisplay =
          'k6 binary not found on system. Please install k6 (https://k6.io) to run load tests.';
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      results = { error: errorDisplay, stderr: err.stderr };
    } finally {
      // Simple cleanup
      try {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch (e) {
        console.error('Failed to cleanup k6 temp files', e);
      }
    }

    const duration = Date.now() - startTime;

    try {
      return await this.prisma.loadExecution.create({
        data: {
          loadTestId: test.id,
          status,
          duration,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          results: results,
        },
      });
    } catch (dbErr) {
      console.error('[LoadExecution] Database save failed:', dbErr);
      throw dbErr;
    }
  }

  async getHistory(loadTestId: string) {
    return this.prisma.loadExecution.findMany({
      where: { loadTestId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async clearHistory(loadTestId: string) {
    return this.prisma.loadExecution.deleteMany({
      where: { loadTestId },
    });
  }
}
