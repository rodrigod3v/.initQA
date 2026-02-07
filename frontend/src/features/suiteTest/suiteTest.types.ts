import { type ExecutionResult } from '@/shared/types/api';

export interface SuiteTestPayload {
    projectId: string;
    environmentId?: string;
}

export interface SuiteTestResult {
    status: "success" | "error";
    results: ExecutionResult[];
}
