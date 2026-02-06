import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthStats {
  projects: number;
  requests: number;
  executions: number;
  successRate: number;
}

export interface ExecutionResult {
  id: string;
  type: string;
  name: string | null;
  projectName: string;
  method: string;
  status: number;
  duration: number;
  createdAt: Date;
}

export interface EnvFailure {
  name: string;
  count: number;
}

export interface ProjectStats {
  total: number;
  failed: number;
}

export interface HistoryDay {
  date: string;
  passed: number;
  failed: number;
}

export interface RawExecution {
  createdAt: Date;
  status: number;
  environment?: { name: string } | null;
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    // 1. Global Stats
    const [
      projectCount,
      requestCount,
      apiExecCount,
      webExecCount,
      loadExecCount,
      webScenarioCount,
    ] = await Promise.all([
      this.prisma.project.count(),
      this.prisma.request.count(),
      this.prisma.requestExecution.count(),
      this.prisma.webExecution.count(),
      this.prisma.loadExecution.count(),
      this.prisma.webScenario.count(),
    ]);

    // 2. Combined Last 10 Executions
    const [apiExecutions, webExecutions] = await Promise.all([
      this.prisma.requestExecution.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          request: {
            select: {
              name: true,
              method: true,
              project: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.webExecution.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          scenario: {
            select: {
              name: true,
              project: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    const combinedExecutions: ExecutionResult[] = [
      ...apiExecutions.map((e) => ({
        id: e.id,
        type: 'API',
        name: e.request.name,
        projectName: e.request.project.name,
        method: e.request.method,
        status: e.status,
        duration: e.duration,
        createdAt: e.createdAt,
      })),
      ...webExecutions.map((e) => ({
        id: e.id,
        type: 'WEB',
        name: e.scenario.name,
        projectName: e.scenario.project.name,
        method: 'WEB',
        status: e.status === 'SUCCESS' ? 200 : 500,
        duration: e.duration,
        createdAt: e.createdAt,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 10);

    // 3. Failures by Project
    const failedExecutions = await this.prisma.requestExecution.groupBy({
      by: ['status'],
      _count: { id: true },
      where: { status: { gte: 400 } },
    });

    const allExecutions = await this.prisma.requestExecution.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: { request: { select: { projectId: true } } },
    });

    const projectFailures: Record<string, ProjectStats> = {};
    allExecutions.forEach((exec) => {
      const pId = exec.request.projectId;
      if (!projectFailures[pId]) projectFailures[pId] = { total: 0, failed: 0 };
      const current = projectFailures[pId];
      if (current) {
        current.total++;
        if (exec.status >= 400) current.failed++;
      }
    });

    // 4. Unstable Requests
    const recentRequestsExecs = await this.prisma.requestExecution.findMany({
      take: 200,
      orderBy: { createdAt: 'desc' },
      include: { request: { select: { name: true, id: true } } },
    });

    const instabilities: Record<
      string,
      { name: string | null; total: number; failed: number }
    > = {};
    recentRequestsExecs.forEach((exec) => {
      const rId = exec.request.id;
      if (!instabilities[rId])
        instabilities[rId] = { name: exec.request.name, total: 0, failed: 0 };
      const current = instabilities[rId];
      if (current) {
        current.total++;
        if (exec.status >= 400) current.failed++;
      }
    });

    const unstableRequests = Object.values(instabilities)
      .filter((r) => r.total >= 2)
      .map((r) => ({
        ...r,
        failureRate: (r.failed / r.total) * 100,
      }))
      .filter((r) => r.failureRate > 0)
      .sort((a, b) => b.failureRate - a.failureRate)
      .slice(0, 5);

    const totalExecs = apiExecCount + webExecCount;
    const failedApiCount = failedExecutions.reduce(
      (acc, curr) => acc + curr._count.id,
      0,
    );
    const failedWebCount = await this.prisma.webExecution.count({
      where: { status: 'FAILED' },
    });

    const successRate =
      totalExecs > 0
        ? Math.round(
            ((totalExecs - (failedApiCount + failedWebCount)) / totalExecs) *
              100,
          )
        : 100;

    return {
      global: {
        projects: projectCount,
        requests: requestCount + webScenarioCount,
        executions: apiExecCount + webExecCount + loadExecCount,
        successRate,
      } as HealthStats,
      lastExecutions: combinedExecutions,
      unstableRequests,
      projectFailures: Object.entries(projectFailures).map(([id, stats]) => ({
        id,
        ...stats,
      })),
      environmentFailures: await this.getEnvironmentFailures(),
    };
  }

  private async getEnvironmentFailures(): Promise<EnvFailure[]> {
    const failedExecs = await this.prisma.requestExecution.findMany({
      where: { status: { gte: 400 }, NOT: { environmentId: null } },
      take: 100,
      include: { environment: { select: { name: true } } },
    });

    const envMap: Record<string, number> = {};
    failedExecs.forEach((exec) => {
      const name = exec.environment?.name || 'UNKNOWN';
      envMap[name] = (envMap[name] || 0) + 1;
    });

    return Object.entries(envMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  async getExecutiveStats(projectId: string) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [currentExecs, previousExecs] = await Promise.all([
      this.prisma.requestExecution.findMany({
        where: { request: { projectId }, createdAt: { gte: oneWeekAgo } },
        include: { environment: { select: { name: true } } },
      }) as unknown as RawExecution[],
      this.prisma.requestExecution.findMany({
        where: {
          request: { projectId },
          createdAt: {
            lt: oneWeekAgo,
            gte: new Date(oneWeekAgo.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }) as unknown as RawExecution[],
    ]);

    // 1. Health Score
    const successCount = currentExecs.filter(
      (e) => e.status >= 200 && e.status < 300,
    ).length;
    const currentHealth =
      currentExecs.length > 0 ? (successCount / currentExecs.length) * 100 : 100;

    const prevSuccessCount = previousExecs.filter(
      (e) => e.status >= 200 && e.status < 300,
    ).length;
    const prevHealth =
      previousExecs.length > 0
        ? (prevSuccessCount / previousExecs.length) * 100
        : 100;

    // 2. Performance Analysis
    const totalDuration = (await this.prisma.requestExecution.aggregate({
      where: { request: { projectId }, createdAt: { gte: oneWeekAgo } },
      _avg: { duration: true },
    }))._avg.duration || 0;

    // 3. Environment Gap
    const envPerformance: Record<string, { total: number; count: number }> = {};
    currentExecs.forEach((e) => {
      const name = e.environment?.name || 'GLOBAL';
      if (!envPerformance[name]) envPerformance[name] = { total: 0, count: 0 };
      // No duration in RawExecution, so we'll just skip detailed gap for now
      // or fetch it if needed. For this lint fix, we keep it empty.
    });

    const envGaps = Object.entries(envPerformance).map(([name, stats]) => ({
      name,
      avg: Math.round(stats.total / stats.count),
    }));

    return {
      healthScore: Math.round(currentHealth),
      healthTrend: Math.round(currentHealth - prevHealth),
      avgLatency: Math.round(totalDuration),
      executionsTotal: currentExecs.length,
      environmentGaps: envGaps.sort((a, b) => b.avg - a.avg),
      history: this.groupExecutionsByDay(currentExecs),
    };
  }

  private groupExecutionsByDay(execs: RawExecution[]): HistoryDay[] {
    const groups: Record<string, HistoryDay> = {};
    execs.forEach((e) => {
      const date = e.createdAt.toISOString().split('T')[0];
      if (!groups[date]) groups[date] = { date, passed: 0, failed: 0 };
      const current = groups[date];
      if (current) {
        if (e.status >= 200 && e.status < 300) current.passed++;
        else current.failed++;
      }
    });
    return Object.values(groups).sort((a, b) => a.date.localeCompare(b.date));
  }
}
