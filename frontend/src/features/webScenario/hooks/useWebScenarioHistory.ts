import { useState, useEffect, useCallback } from 'react';
import api from '@/shared/api';
import { type ExecutionResult } from '@/shared/types/api';

export const useWebScenarioHistory = (projectId?: string, selectedScenarioId?: string) => {
    const [projectHistory, setProjectHistory] = useState<ExecutionResult[]>([]);

    const fetchProjectHistory = useCallback(async () => {
        const id = projectId;
        if (!id) return;
        try {
            const response = await api.get(`/web-scenarios/project-history/${id}`);
            setProjectHistory(response.data);
        } catch {
            console.error('Failed to fetch project history');
        }
    }, [projectId]);

    useEffect(() => {
        if (projectId) {
            const timer = setTimeout(() => {
                fetchProjectHistory();
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [projectId, selectedScenarioId, fetchProjectHistory]);

    return {
        projectHistory,
        fetchProjectHistory
    };
};
