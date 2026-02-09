import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { HttpRequestView } from './HttpRequest.view';
import { useRequestStore } from '@/stores/requestStore';
import { useProjectStore, type Project } from '@/stores/projectStore';
import api from '@/shared/api';
import type { RequestModel } from '@/shared/types/api';
import type { Environment } from '@/features/webScenario/hooks/useProjectMetadata';

export const HttpRequestPage: React.FC = () => {
    const navigate = useNavigate();
    const { projectId } = useParams<{ projectId: string }>();

    // Store State - Optimized Subscriptions
    const requests = useRequestStore(state => state.requests);
    const selectedRequest = useRequestStore(state => state.selectedRequest);
    const executing = useRequestStore(state => state.executing);
    const lastResult = useRequestStore(state => state.lastResult);
    const syncStatus = useRequestStore(state => state.syncStatus);
    const projectHistory = useRequestStore(state => state.projectHistory);
    const batchExecuting = useRequestStore(state => state.batchExecuting);

    const fetchRequests = useRequestStore(state => state.fetchRequests);
    const selectRequest = useRequestStore(state => state.selectRequest);
    const addRequest = useRequestStore(state => state.addRequest);
    const updateLocalRequest = useRequestStore(state => state.updateLocalRequest);
    const deleteRequest = useRequestStore(state => state.deleteRequest);
    const executeRequest = useRequestStore(state => state.executeRequest);
    const batchExecute = useRequestStore(state => state.batchExecute);
    const fetchProjectHistory = useRequestStore(state => state.fetchProjectHistory);
    const clearProjectHistory = useRequestStore(state => state.clearProjectHistory);

    // Project Store Sync
    const selectProject = useProjectStore(state => state.selectProject);

    // Environment State
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [selectedEnvId, setSelectedEnvId] = useState<string>('');
    const [projects, setProjects] = useState<Project[]>([]);

    const fetchProjects = useCallback(async () => {
        try {
            const response = await api.get('/projects');
            setProjects(response.data);
        } catch {
            console.error('Failed to fetch projects');
        }
    }, []);

    const fetchEnvironments = useCallback(async (pId: string) => {
        try {
            const response = await api.get(`/projects/${pId}/environments`);
            setEnvironments(response.data);
            if (response.data.length > 0 && !selectedEnvId) {
                setSelectedEnvId(response.data[0].id);
            }
        } catch {
            console.error('Failed to fetch environments');
        }
    }, [selectedEnvId]);

    // Initial Data Fetch
    useEffect(() => {
        if (projectId) {
            fetchRequests(projectId);
            fetchProjectHistory(projectId);
            fetchEnvironments(projectId);

            // Sync selected project in store for Sidebar context
            const syncProject = async () => {
                try {
                    const resp = await api.get(`/projects/${projectId}`);
                    selectProject(resp.data);
                } catch {
                    console.error('Failed to sync project store');
                }
            };
            syncProject();
        }
        fetchProjects();
    }, [projectId, selectProject, fetchRequests, fetchProjectHistory, fetchEnvironments, fetchProjects]);

    const handleCreateRequest = async (name: string) => {
        if (!projectId) return;
        try {
            const isUrl = name.startsWith('http://') || name.startsWith('https://');
            const response = await api.post('/requests', {
                name: isUrl ? new URL(name).pathname.slice(1) || name : name,
                projectId,
                method: 'GET',
                url: isUrl ? name : 'https://api.example.com/status',
                headers: {},
                body: {}
            });
            addRequest(response.data);
            selectRequest(response.data);
        } catch {
            console.error('Failed to create request');
        }
    };

    const handleExecute = useCallback(async () => {
        if (selectedRequest) {
            await executeRequest(selectedRequest.id, selectedEnvId || undefined);
        }
    }, [selectedRequest, executeRequest, selectedEnvId]);

    const updateRequestField = useCallback((field: keyof RequestModel, value: unknown) => {
        if (!selectedRequest) return;
        updateLocalRequest(selectedRequest.id, { [field]: value });
    }, [selectedRequest, updateLocalRequest]);

    const handleDelete = async () => {
        if (selectedRequest) {
            await deleteRequest(selectedRequest.id);
        }
    };

    const handleClearHistory = async () => {
        if (projectId) {
            await clearProjectHistory(projectId);
        }
    };

    const handleMagicAssert = useCallback(() => {
        if (!lastResult?.response?.data || !selectedRequest) return;

        let script = selectedRequest.testScript || '';
        if (script && !script.endsWith('\n')) script += '\n';

        const data = lastResult.response.data;

        // Basic Status Assertion
        if (!script.includes(`pm.response.to.have.status(${lastResult.status})`)) {
            script += `pm.test("Status code is ${lastResult.status}", () => {\n    pm.response.to.have.status(${lastResult.status});\n});\n\n`;
        }

        // Schema-based assertions (simplified)
        const generateExpects = (obj: unknown, path = 'pm.response.json()', depth = 0): string => {
            if (depth > 2) return ''; // Limit depth
            let lines = '';
            if (Array.isArray(obj)) {
                lines += `pm.test("${path} is an array", () => {\n    pm.expect(${path}).to.be.an('array');\n});\n`;
                if (obj.length > 0) {
                    lines += generateExpects(obj[0], `${path}[0]`, depth + 1);
                }
            } else if (typeof obj === 'object' && obj !== null) {
                const typedObj = obj as Record<string, unknown>;
                Object.keys(typedObj).slice(0, 5).forEach(key => {
                    const val = typedObj[key];
                    const type = Array.isArray(val) ? 'array' : typeof val;
                    lines += `pm.test("${key} has correct type", () => {\n    pm.expect(${path}).to.have.property('${key}');\n    pm.expect(${path}.${key}).to.be.a('${type}');\n});\n`;
                });
            }
            return lines;
        };

        script += generateExpects(data);
        updateRequestField('testScript', script);
    }, [lastResult, selectedRequest, updateRequestField]);

    const handleMagicChain = useCallback((path: string) => {
        if (!selectedRequest) return;
        let script = selectedRequest.testScript || '';
        if (script && !script.endsWith('\n')) script += '\n';

        const varName = path.split('.').pop() || 'extracted_var';
        script += `// Auto-chained variable extraction\npm.environment.set("${varName}", pm.response.json().${path});\n`;

        updateRequestField('testScript', script);
    }, [selectedRequest, updateRequestField]);

    if (!projectId) {
        return <Navigate to="/projects" replace />;
    }

    return (
        <HttpRequestView
            requests={requests}
            selectedRequest={selectedRequest}
            onSelectRequest={selectRequest}
            onRunTest={handleExecute}
            onRunSuite={() => batchExecute(projectId, selectedEnvId || undefined)}
            isRunningTest={executing}
            isRunningSuite={batchExecuting}
            testResult={lastResult}
            projectHistory={projectHistory}
            projectId={projectId}
            projects={projects}
            onSelectProject={(id) => navigate(`/projects/${id}/requests`)}
            environments={environments}
            selectedEnvId={selectedEnvId}
            onSelectEnv={setSelectedEnvId}
            onDeleteEnv={async (id) => {
                await api.delete(`/projects/environments/${id}`);
                setEnvironments(envs => envs.filter(e => e.id !== id));
            }}
            onCreateEnv={async (name, vars) => {
                const resp = await api.post(`/projects/${projectId}/environments`, { name, variables: vars });
                setEnvironments(envs => [...envs, resp.data]);
                setSelectedEnvId(resp.data.id);
            }}
            syncStatus={syncStatus}
            onDelete={handleDelete}
            onUpdateRequest={updateRequestField}
            onCreateRequest={handleCreateRequest}
            onDeleteRequest={deleteRequest}
            onClearHistory={handleClearHistory}
            onViewHistory={useRequestStore.getState().viewExecution}
            onMagicAssert={handleMagicAssert}
            onMagicChain={handleMagicChain}
        />
    );
};

export default HttpRequestPage;
