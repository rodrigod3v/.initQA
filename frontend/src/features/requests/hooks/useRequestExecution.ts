import { useState } from 'react';
import api from '@/shared/api';
import type { ExecutionResult } from '@/shared/types/api';

export const useRequestExecution = (
    selectedEnvId: string,
    onHistoryUpdate: () => void
) => {
    const [executing, setExecuting] = useState(false);
    const [lastExecution, setLastExecution] = useState<ExecutionResult | null>(null);

    const handleExecute = async (requestId: string, autoSave?: () => Promise<void>) => {
        setExecuting(true);
        try {
            if (autoSave) await autoSave();
            const response = await api.post(`/requests/${requestId}/execute${selectedEnvId ? `?environmentId=${selectedEnvId}` : ''}`);
            setLastExecution(response.data);
            onHistoryUpdate();
            return response.data;
        } catch {
            console.error('Execution failed');
        } finally {
            setExecuting(false);
        }
    };

    return {
        executing,
        lastExecution,
        setLastExecution,
        handleExecute
    };
};
