import { type ExecutionResult } from '@/shared/types/api';

export interface RunTestPayload {
    requestId: string;
    environmentId?: string;
}

export interface RunTestResult {
    status: "success" | "error";
    response: ExecutionResult | string;
}
