import { requestService } from '@/shared/api/request.service';
import type { RunTestPayload, RunTestResult } from './runTest.types';

export const runTestActions = {
    async executeTest(payload: RunTestPayload): Promise<RunTestResult> {
        try {
            const result = await requestService.execute(payload.requestId, payload.environmentId);
            return {
                status: "success",
                response: result,
            };
        } catch (error: any) {
            return {
                status: "error",
                response: error.response?.data || error.message,
            };
        }
    }
};
