import { Injectable } from '@nestjs/common';
import { ExecutionService } from '../execution/execution.service';
import * as jsondiffpatch from 'jsondiffpatch';

@Injectable()
export class ComparisonService {
  private differ = jsondiffpatch.create();

  constructor(private executionService: ExecutionService) {}

  async compareEnvironments(requestId: string, environmentIds: string[]) {
    const results = await Promise.all(
      environmentIds.map(async (envId) => {
        const execution = await this.executionService.execute(requestId, envId);
        return {
          environmentId: envId,
          execution,
        };
      }),
    );

    const comparisons = [];
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const left = results[i];
        const right = results[j];

        const delta = this.differ.diff(
          left.execution.response['data'],
          right.execution.response['data'],
        );

        comparisons.push({
          environments: [left.environmentId, right.environmentId],
          statusDiff: left.execution.status !== right.execution.status,
          leftStatus: left.execution.status,
          rightStatus: right.execution.status,
          delta,
        });
      }
    }

    return {
      results,
      comparisons,
    };
  }
}
