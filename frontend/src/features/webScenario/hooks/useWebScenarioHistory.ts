import { useState, useEffect } from 'react';
import api from '@/shared/api';

export const useWebScenarioHistory = (projectId?: string, selectedScenarioId?: string) => {
    const [projectHistory, setProjectHistory] = useState<any[]>([]);

    const fetchProjectHistory = async () => {
        const id = projectId;
        if (!id) return;
        try {
            const response = await api.get(`/web-scenarios/project-history/${id}`);
            setProjectHistory(response.data);
        } catch (err) {
            console.error('Failed to fetch project history');
        }
    };

    useEffect(() => {
        if (projectId) {
            fetchProjectHistory();
        }
    }, [projectId, selectedScenarioId]);

    return {
        projectHistory,
        fetchProjectHistory
    };
};
