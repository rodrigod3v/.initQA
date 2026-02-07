import { useState } from 'react';
import { suiteTestActions } from './suiteTest.actions';
import type { SuiteTestPayload } from './suiteTest.types';
import { type ExecutionResult } from '@/shared/types/api';

export const useSuiteTest = () => {
    const [results, setResults] = useState<ExecutionResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const runSuite = async (payload: SuiteTestPayload) => {
        setIsLoading(true);
        setError(null);
        try {
            const actionResult = await suiteTestActions.executeSuite(payload);
            if (actionResult.status === 'success') {
                setResults(actionResult.results);
            } else {
                setError('Suite execution failed');
            }
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            setError(errorObj.message || 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return {
        runSuite,
        results,
        isLoading,
        error,
    };
};
