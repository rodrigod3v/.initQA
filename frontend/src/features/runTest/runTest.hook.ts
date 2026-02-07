import { useState } from 'react';
import { runTestActions } from './runTest.actions';
import type { RunTestPayload, RunTestResult } from './runTest.types';

export const useRunTest = () => {
    const [result, setResult] = useState<RunTestResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const runTest = async (payload: RunTestPayload) => {
        setIsLoading(true);
        setError(null);
        try {
            const actionResult = await runTestActions.executeTest(payload);
            setResult(actionResult);
            if (actionResult.status === 'error') {
                setError(typeof actionResult.response === 'string' ? actionResult.response : 'Test execution failed');
            }
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            setError(errorObj.message || 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return {
        runTest,
        result,
        isLoading,
        error,
    };
};
