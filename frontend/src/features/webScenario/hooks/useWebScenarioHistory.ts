import { useState, useEffect, useCallback } from 'react';
import api from '@/shared/api';
import { type ExecutionResult } from '@/shared/types/api';

export const useWebScenarioHistory = (projectId?: string, selectedScenarioId?: string) => {
    const [projectHistory, setProjectHistory] = useState<ExecutionResult[]>([]);
    const [scenarioHistory, setScenarioHistory] = useState<ExecutionResult[]>([]);

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

    const fetchScenarioHistory = useCallback(async (scenarioId: string) => {
        if (!scenarioId) return;
        try {
            const response = await api.get(`/web-scenarios/${scenarioId}/history`);
            setScenarioHistory(response.data);
        } catch {
            console.error('Failed to fetch scenario history');
        }
    }, []);

    useEffect(() => {
        if (projectId) {
            const timer = setTimeout(() => {
                fetchProjectHistory();
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [projectId, selectedScenarioId, fetchProjectHistory]);

    // Fetch scenario history when a scenario is selected
    useEffect(() => {
        if (selectedScenarioId) {
            fetchScenarioHistory(selectedScenarioId);
        } else {
            setScenarioHistory([]);
        }
    }, [selectedScenarioId, fetchScenarioHistory]);

    return {
        projectHistory,
        scenarioHistory,
        fetchProjectHistory,
        fetchScenarioHistory
    };
};
