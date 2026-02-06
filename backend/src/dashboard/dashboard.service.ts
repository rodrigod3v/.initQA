import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    // 1. Global Stats
    const [projectCount, requestCount, apiExecCount, webExecCount, loadExecCount] = await Promise.all([
      this.prisma.project.count(),
      this.prisma.request.count(),
      this.prisma.requestExecution.count(),
      this.prisma.webExecution.count(),
      this.prisma.loadExecution.count(),
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
      })
    ]);

    const combinedExecutions = [
      ...apiExecutions.map(e => ({
        id: e.id,
        type: 'API',
        name: e.request.name,
        projectName: e.request.project.name,
        method: e.request.method,
        status: e.status,
        duration: e.duration,
        createdAt: e.createdAt
      })),
      ...webExecutions.map(e => ({
        id: e.id,
        type: 'WEB',
        name: e.scenario.name,
        projectName: e.scenario.project.name,
        method: 'WEB',
        status: e.status === 'SUCCESS' ? 200 : 500,
        duration: e.duration,
        createdAt: e.createdAt
      }))
    ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

    // 3. Failures by Project (for chart)
    const failedExecutions = await this.prisma.requestExecution.groupBy({
      by: ['status'],
      _count: { id: true },
      where: { status: { gte: 400 } },
    });
    
    // Let's do a more detail grouping for projects
    const allExecutions = await this.prisma.requestExecution.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: { request: { select: { projectId: true } } }
    });
    
    const projectFailures = {};
    allExecutions.forEach(exec => {
        const pId = exec.request.projectId;
        if (!projectFailures[pId]) projectFailures[pId] = { total: 0, failed: 0 };
        projectFailures[pId].total++;
        if (exec.status >= 400) projectFailures[pId].failed++;
    });

    // 4. Unstable Requests (last 50 executions, grouped by request)
    const recentRequestsExecs = await this.prisma.requestExecution.findMany({
        take: 200,
        orderBy: { createdAt: 'desc' },
        include: { request: { select: { name: true, id: true } } }
    });

    const instabilities = {};
    recentRequestsExecs.forEach(exec => {
        const rId = exec.request.id;
        if (!instabilities[rId]) instabilities[rId] = { name: exec.request.name, total: 0, failed: 0 };
        instabilities[rId].total++;
        if (exec.status >= 400) instabilities[rId].failed++;
    });

    const unstableRequests = Object.values(instabilities)
        .filter((r: any) => r.total >= 2)
        .map((r: any) => ({
            ...r,
            failureRate: (r.failed / r.total) * 100
        }))
        .filter(r => r.failureRate > 0)
        .sort((a, b) => b.failureRate - a.failureRate)
        .slice(0, 5);

    const totalExecs = apiExecCount + webExecCount;
    const failedApiCount = failedExecutions.reduce((acc, curr) => acc + curr._count.id, 0);
    const failedWebCount = await this.prisma.webExecution.count({ where: { status: 'FAILED' } });

    const successRate = totalExecs > 0
      ? Math.round(((totalExecs - (failedApiCount + failedWebCount)) / totalExecs) * 100)
      : 100;

    return {
      global: {
        projects: projectCount,
        requests: requestCount + (await this.prisma.webScenario.count()),
        executions: apiExecCount + webExecCount + loadExecCount,
        successRate
      },
      lastExecutions: combinedExecutions,
      unstableRequests,
      projectFailures: Object.entries(projectFailures).map(([id, stats]: [string, any]) => ({
        id,
        ...stats
      })),
      environmentFailures: await this.getEnvironmentFailures()
    };
  }

  private async getEnvironmentFailures() {
    const failedExecs = await this.prisma.requestExecution.findMany({
        where: { status: { gte: 400 }, NOT: { environmentId: null } },
        take: 100,
        include: { environment: { select: { name: true } } }
    });

    const envMap = {};
    failedExecs.forEach(exec => {
        const name = exec.environment?.name || 'UNKNOWN';
        envMap[name] = (envMap[name] || 0) + 1;
    });

    return Object.entries(envMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => (b.count as number) - (a.count as number))
        .slice(0, 5);
  }

  async getExecutiveStats(projectId: string) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [currentExecs, previousExecs] = await Promise.all([
      this.prisma.requestExecution.findMany({
        where: { request: { projectId }, createdAt: { gte: oneWeekAgo } },
        include: { environment: { select: { name: true } } }
      }),
      this.prisma.requestExecution.findMany({
        where: { 
          request: { projectId }, 
          createdAt: { 
            lt: oneWeekAgo, 
            gte: new Date(oneWeekAgo.getTime() - 7 * 24 * 60 * 60 * 1000) 
          } 
        }
      })
    ]);

    // 1. Health Score
    const successCount = currentExecs.filter(e => e.status >= 200 && e.status < 300).length;
    const currentHealth = currentExecs.length > 0 ? (successCount / currentExecs.length) * 100 : 100;
    
    const prevSuccessCount = previousExecs.filter(e => e.status >= 200 && e.status < 300).length;
    const prevHealth = previousExecs.length > 0 ? (prevSuccessCount / previousExecs.length) * 100 : 100;

    // 2. Performance Analysis
    const avgDuration = currentExecs.length > 0 
      ? currentExecs.reduce((acc, curr) => acc + curr.duration, 0) / currentExecs.length 
      : 0;

    // 3. Environment Gap
    const envPerformance = {};
    currentExecs.forEach(e => {
      const name = e.environment?.name || 'GLOBAL';
      if (!envPerformance[name]) envPerformance[name] = { total: 0, count: 0 };
      envPerformance[name].total += e.duration;
      envPerformance[name].count++;
    });

    const envGaps = Object.entries(envPerformance).map(([name, stats]: [string, any]) => ({
      name,
      avg: Math.round(stats.total / stats.count)
    }));

    return {
      healthScore: Math.round(currentHealth),
      healthTrend: Math.round(currentHealth - prevHealth),
      avgLatency: Math.round(avgDuration),
      executionsTotal: currentExecs.length,
      environmentGaps: envGaps.sort((a, b) => b.avg - a.avg),
      history: this.groupExecutionsByDay(currentExecs)
    };
  }

  private groupExecutionsByDay(execs: any[]) {
    const groups = {};
    execs.forEach(e => {
      const date = e.createdAt.toISOString().split('T')[0];
      if (!groups[date]) groups[date] = { date, passed: 0, failed: 0 };
      if (e.status >= 200 && e.status < 300) groups[date].passed++;
      else groups[date].failed++;
    });
    return Object.values(groups).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }
}
