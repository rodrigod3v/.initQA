import { useState, useEffect } from 'react';
import api from '@/shared/api';

export interface Environment {
    id: string;
    name: string;
    variables: any;
}

export const useProjectMetadata = (projectId?: string) => {
    const [projects, setProjects] = useState<any[]>([]);
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [selectedEnvId, setSelectedEnvId] = useState<string>('');
    const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || '');

    const fetchProjects = async () => {
        try {
            const response = await api.get('/projects');
            setProjects(response.data);
            if (!selectedProjectId && response.data.length > 0) {
                setSelectedProjectId(response.data[0].id);
            }
        } catch (err) {
            console.error('Failed to fetch projects');
        }
    };

    const fetchEnvironments = async (pId: string) => {
        try {
            const response = await api.get(`/projects/${pId}/environments`);
            setEnvironments(response.data);
            if (response.data.length > 0) {
                setSelectedEnvId(response.data[0].id);
            }
        } catch (err) {
            console.error('Failed to fetch environments');
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    useEffect(() => {
        const id = projectId || selectedProjectId;
        if (id) {
            fetchEnvironments(id);
        }
    }, [projectId, selectedProjectId]);

    return {
        projects,
        environments,
        setEnvironments,
        selectedEnvId,
        setSelectedEnvId,
        selectedProjectId,
        setSelectedProjectId,
        fetchProjects,
        fetchEnvironments
    };
};
