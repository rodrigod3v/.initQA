import { useState } from 'react';
import api from '@/shared/api';
import type { WebScenario } from '@/stores/scenarioStore';

export const useWebScenarioExecution = (
    selectedEnvId: string,
    onHistoryUpdate: () => void
) => {
    const [batchExecuting, setBatchExecuting] = useState(false);
    const [runningScenarios, setRunningScenarios] = useState<Set<string>>(new Set());

    const handleRunAll = async (scenarios: WebScenario[]) => {
        if (scenarios.length === 0) return;
        setBatchExecuting(true);

        const running = new Set(scenarios.map(s => s.id));
        setRunningScenarios(running);

        try {
            await Promise.all(scenarios.map(async (s) => {
                try {
                    await api.post(`/web-scenarios/${s.id}/execute${selectedEnvId ? `?environmentId=${selectedEnvId}` : ''}`);
                } catch (e) {
                    console.error(`Failed to run scenario ${s.name}`);
                } finally {
                    setRunningScenarios(prev => {
                        const next = new Set(prev);
                        next.delete(s.id);
                        return next;
                    });
                    onHistoryUpdate();
                }
            }));
        } catch (err) {
            console.error('Batch execution failed');
        } finally {
            setBatchExecuting(false);
            setRunningScenarios(new Set());
        }
    };

    const handleRunSingle = async (scenarioId: string) => {
        setRunningScenarios(prev => new Set(prev).add(scenarioId));
        try {
            await api.post(`/web-scenarios/${scenarioId}/execute${selectedEnvId ? `?environmentId=${selectedEnvId}` : ''}`);
            onHistoryUpdate();
        } catch (err) {
            console.error('Scenario execution failed');
        } finally {
            setRunningScenarios(prev => {
                const next = new Set(prev);
                next.delete(scenarioId);
                return next;
            });
        }
    };

    return {
        batchExecuting,
        runningScenarios,
        handleRunAll,
        handleRunSingle
    };
};
