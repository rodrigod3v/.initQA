import { useState, useEffect } from 'react';
import api from '@/shared/api';

export const useRequestHistory = (projectId?: string, requestId?: string) => {
    const [projectHistory, setProjectHistory] = useState<any[]>([]);

    const fetchProjectHistory = async () => {
        const id = projectId;
        if (!id) return;
        try {
            const response = await api.get(`/requests/project-history/${id}`);
            setProjectHistory(response.data);
        } catch (err) {
            console.error('Failed to fetch request history');
        }
    };

    useEffect(() => {
        if (projectId) {
            fetchProjectHistory();
        }
    }, [projectId, requestId]);

    return {
        projectHistory,
        fetchProjectHistory
    };
};
