import { useState, useEffect, useCallback } from 'react';
import api from '@/shared/api';
import type { ExecutionResult } from '@/shared/types/api';

export const useRequestHistory = (projectId?: string, requestId?: string) => {
    const [projectHistory, setProjectHistory] = useState<ExecutionResult[]>([]);

    const fetchProjectHistory = useCallback(async () => {
        const id = projectId;
        if (!id) return;
        try {
            const response = await api.get(`/requests/project-history/${id}`);
            setProjectHistory(response.data);
        } catch {
            console.error('Failed to fetch request history');
        }
    }, [projectId]);

    useEffect(() => {
        if (projectId) {
            const timer = setTimeout(() => {
                fetchProjectHistory();
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [projectId, requestId, fetchProjectHistory]);

    return {
        projectHistory,
        fetchProjectHistory
    };
};
