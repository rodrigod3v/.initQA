import { RequestService } from '@/services/RequestService';
import type { SuiteTestPayload, SuiteTestResult } from './suiteTest.types';

export const suiteTestActions = {
    async executeSuite(payload: SuiteTestPayload): Promise<SuiteTestResult> {
        try {
            // Note: Backend might need a specific batch endpoint if not already available, 
            // but based on existing requestStore, it might be sequential calls or a project-wide execute.
            // For now, using the project activity as a proxy or as defined in the store.
            const result = await RequestService.getProjectHistory(payload.projectId);
            return {
                status: "success",
                results: result,
            };
        } catch (error: any) {
            return {
                status: "error",
                results: [],
            };
        }
    }
};
