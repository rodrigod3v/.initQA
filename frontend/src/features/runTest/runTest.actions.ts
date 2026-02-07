import { RequestService } from '@/services/RequestService';
import type { RunTestPayload, RunTestResult } from './runTest.types';

export const runTestActions = {
    async executeTest(payload: RunTestPayload): Promise<RunTestResult> {
        try {
            const result = await RequestService.execute(payload.requestId, payload.environmentId);
            return {
                status: "success",
                response: result,
            };
        } catch (error: unknown) {
            const err = error as { response?: { data?: string }, message?: string };
            return {
                status: "error",
                response: err.response?.data || err.message || 'Unknown error',
            };
        }
    }
};
