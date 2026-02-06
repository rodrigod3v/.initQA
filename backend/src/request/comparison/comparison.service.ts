import { Injectable } from '@nestjs/common';
import { ExecutionService } from '../execution/execution.service';
import * as jsondiffpatch from 'jsondiffpatch';

@Injectable()
export class ComparisonService {
  private differ = jsondiffpatch.create();

  constructor(private executionService: ExecutionService) {}

  async compare(requestId: string, leftEnvId: string, rightEnvId: string, maskingKeys: string[] = []) {
    const [leftExecution, rightExecution] = await Promise.all([
      this.executionService.execute(requestId, leftEnvId),
      this.executionService.execute(requestId, rightEnvId),
    ]);

    let leftData = (leftExecution.response as any)?.data;
    let rightData = (rightExecution.response as any)?.data;

    if (maskingKeys.length > 0) {
      leftData = this.maskData(leftData, maskingKeys);
      rightData = this.maskData(rightData, maskingKeys);
    }

    const delta = this.differ.diff(leftData, rightData);

    return {
      left: { ...(leftExecution as any), response: { ...(leftExecution.response as any), data: leftData } },
      right: { ...(rightExecution as any), response: { ...(rightExecution.response as any), data: rightData } },
      delta,
    };
  }

  private maskData(data: any, keys: string[]): any {
    if (!data || typeof data !== 'object') return data;
    
    if (Array.isArray(data)) {
      return data.map(item => this.maskData(item, keys));
    }

    const masked = { ...data };
    for (const key in masked) {
      if (keys.includes(key)) {
        masked[key] = '***MASKED***';
      } else if (typeof masked[key] === 'object') {
        masked[key] = this.maskData(masked[key], keys);
      }
    }
    return masked;
  }
}
