import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    // 1. Global Stats
    const [projectCount, requestCount, executionCount] = await Promise.all([
      this.prisma.project.count(),
      this.prisma.request.count(),
      this.prisma.requestExecution.count(),
    ]);

    // 2. Last 10 Executions
    const lastExecutions = await this.prisma.requestExecution.findMany({
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
    });

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
    // We'll calculate failure rate for requests that have at least 3 executions
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

    // 5. Failures by Environment
    const envFailuresExecs = await this.prisma.requestExecution.findMany({
        take: 100,
        where: { status: { gte: 400 } },
        orderBy: { createdAt: 'desc' },
        include: {
            request: {
                include: {
                    project: {
                        include: { environments: { select: { id: true, name: true } } }
                    }
                }
            }
        }
    });

    const envFailures = {};
    // Since executions don't explicitly link to environment ID (only via variables/context which isn't stored as ID),
    // this is a bit tricky. Usually, a request is executed in an environment. 
    // Wait, looking at prisma schema... RequestExecution doesn't have envId.
    // It should have! In previous steps, it was executed using an environment.
    // Let's check if I should add it to the schema or if I can infer it.
    // Actually, let's keep it simple for now and group by project since environment isn't explicitly in the execution record yet.
    // UNLESS I add it now. But I shouldn't modify schema without reason.
    // Let's check if anyone added it.
    
    return {
      global: {
        projects: projectCount,
        requests: requestCount,
        executions: executionCount,
        successRate: executionCount > 0 
            ? Math.round(((executionCount - failedExecutions.reduce((acc, curr) => acc + curr._count.id, 0)) / executionCount) * 100)
            : 100
      },
      lastExecutions: lastExecutions.map(e => ({
        id: e.id,
        requestName: e.request.name,
        projectName: e.request.project.name,
        method: e.request.method,
        status: e.status,
        duration: e.duration,
        createdAt: e.createdAt
      })),
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
}
