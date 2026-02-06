import { Injectable } from '@nestjs/common';
import { ExecutionService } from '../execution/execution.service';
import * as jsondiffpatch from 'jsondiffpatch';

interface ExecutionWithResponse {
  id: string;
  response: unknown;
  [key: string]: unknown;
}

@Injectable()
export class ComparisonService {
  private differ = jsondiffpatch.create();

  constructor(private executionService: ExecutionService) {}

  async compare(
    requestId: string,
    leftEnvId: string,
    rightEnvId: string,
    maskingKeys: string[] = [],
  ) {
    const [leftExecution, rightExecution] = (await Promise.all([
      this.executionService.execute(requestId, leftEnvId),
      this.executionService.execute(requestId, rightEnvId),
    ])) as unknown as ExecutionWithResponse[];

    let leftData = (
      leftExecution.response as { data: unknown } | null | undefined
    )?.data;
    let rightData = (
      rightExecution.response as { data: unknown } | null | undefined
    )?.data;

    if (maskingKeys.length > 0) {
      leftData = this.maskData(leftData, maskingKeys);
      rightData = this.maskData(rightData, maskingKeys);
    }

    const delta = this.differ.diff(leftData, rightData);

    return {
      left: {
        ...leftExecution,
        response: {
          ...(leftExecution.response as Record<string, unknown>),
          data: leftData,
        },
      },
      right: {
        ...rightExecution,
        response: {
          ...(rightExecution.response as Record<string, unknown>),
          data: rightData,
        },
      },
      delta: delta as unknown,
    };
  }

  private maskData(data: unknown, keys: string[]): unknown {
    if (!data || typeof data !== 'object') return data;

    if (Array.isArray(data)) {
      return data.map((item: unknown) => this.maskData(item, keys));
    }

    const masked = { ...(data as Record<string, unknown>) };
    for (const key in masked) {
      if (keys.includes(key)) {
        masked[key] = '***MASKED***';
      } else if (typeof masked[key] === 'object' && masked[key] !== null) {
        masked[key] = this.maskData(masked[key], keys);
      }
    }
    return masked;
  }
}
