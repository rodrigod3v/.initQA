import { Injectable } from '@nestjs/common';
import { ExecutionService } from '../execution/execution.service';
import * as jsondiffpatch from 'jsondiffpatch';

@Injectable()
export class ComparisonService {
  private differ = jsondiffpatch.create();

  constructor(private executionService: ExecutionService) {}

  async compare(requestId: string, leftEnvId: string, rightEnvId: string) {
    const [leftExecution, rightExecution] = await Promise.all([
      this.executionService.execute(requestId, leftEnvId),
      this.executionService.execute(requestId, rightEnvId),
    ]);

    const leftData = (leftExecution.response as any)?.data;
    const rightData = (rightExecution.response as any)?.data;

    const delta = this.differ.diff(leftData, rightData);

    return {
      left: leftExecution,
      right: rightExecution,
      delta,
    };
  }
}
