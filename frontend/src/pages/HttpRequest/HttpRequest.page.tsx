import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { HttpRequestView } from './HttpRequest.view';
import { useRequestStore } from '@/stores/requestStore';
import api from '@/shared/api';
import type { RequestModel } from '@/shared/types/api';

export const HttpRequestPage: React.FC = () => {
    const navigate = useNavigate();
    const { projectId } = useParams<{ projectId: string }>();

    if (!projectId) {
        return <Navigate to="/projects" replace />;
    }

    // Store State
    const {
        requests,
        selectedRequest,
        executing,
        lastResult,
        syncStatus,
        projectHistory,
        fetchRequests,
        selectRequest,
        addRequest,
        updateLocalRequest,
        saveRequest,
        deleteRequest,
        executeRequest,
        fetchProjectHistory,
        clearProjectHistory
    } = useRequestStore(state => state);

    // Environment State
    const [environments, setEnvironments] = useState<any[]>([]);
    const [selectedEnvId, setSelectedEnvId] = useState<string>('');
    const [projects, setProjects] = useState<any[]>([]);

    // Initial Data Fetch
    useEffect(() => {
        if (projectId) {
            fetchRequests(projectId);
            fetchProjectHistory(projectId);
            fetchEnvironments(projectId);
        }
        fetchProjects();
    }, [projectId]);

    const fetchProjects = async () => {
        try {
            const response = await api.get('/projects');
            setProjects(response.data);
        } catch (err) {
            console.error('Failed to fetch projects');
        }
    };

    const fetchEnvironments = async (pId: string) => {
        try {
            const response = await api.get(`/projects/${pId}/environments`);
            setEnvironments(response.data);
            if (response.data.length > 0 && !selectedEnvId) {
                // Keep selected env if possible, otherwise first
                setSelectedEnvId(response.data[0].id);
            }
        } catch (err) {
            console.error('Failed to fetch environments');
        }
    };

    const handleCreateRequest = async (name: string) => {
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
        } catch (err) {
            console.error('Failed to create request');
        }
    };

    const handleExecute = async () => {
        if (selectedRequest) {
            await executeRequest(selectedRequest.id, selectedEnvId || undefined);
        }
    };

    const updateRequestField = (field: keyof RequestModel, value: any) => {
        if (!selectedRequest) return;
        updateLocalRequest(selectedRequest.id, { [field]: value });
    };

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

    return (
        <HttpRequestView
            requests={requests}
            selectedRequest={selectedRequest}
            onSelectRequest={selectRequest}
            onRunTest={handleExecute}
            onRunSuite={() => { }} // Batch execute not implemented in view yet
            isRunningTest={executing}
            isRunningSuite={false}
            testResult={lastResult}
            projectHistory={projectHistory}

            // New Props for full functionality
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
            onSave={async () => { if (selectedRequest) await saveRequest(selectedRequest.id); }}
            onDelete={handleDelete}
            onUpdateRequest={updateRequestField}
            onCreateRequest={handleCreateRequest}
            onClearHistory={handleClearHistory}
        />
    );
};

export default HttpRequestPage;
