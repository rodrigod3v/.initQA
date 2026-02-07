import { useState, useEffect, useCallback } from 'react';
import api from '@/shared/api';
import { type Project } from '@/stores/projectStore';

export interface Environment {
    id: string;
    name: string;
    variables: Record<string, string>;
}

export const useProjectMetadata = (projectId?: string) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [selectedEnvId, setSelectedEnvId] = useState<string>('');
    const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || '');

    const fetchProjects = useCallback(async () => {
        try {
            const response = await api.get('/projects');
            setProjects(response.data);
            if (!selectedProjectId && response.data.length > 0) {
                setSelectedProjectId(response.data[0].id);
            }
        } catch {
            console.error('Failed to fetch projects');
        }
    }, [selectedProjectId]);

    const fetchEnvironments = useCallback(async (pId: string) => {
        try {
            const response = await api.get(`/projects/${pId}/environments`);
            setEnvironments(response.data);
            if (response.data.length > 0) {
                setSelectedEnvId(response.data[0].id);
            }
        } catch {
            console.error('Failed to fetch environments');
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        
        const timer = setTimeout(() => {
            if (isMounted) fetchProjects();
        }, 0);

        return () => { 
            isMounted = false; 
            clearTimeout(timer);
        };
    }, [fetchProjects]);

    useEffect(() => {
        let isMounted = true;
        const id = projectId || selectedProjectId;
        
        let timer: ReturnType<typeof setTimeout>;
        if (id) {
            timer = setTimeout(() => {
                if (isMounted) fetchEnvironments(id);
            }, 0);
        }
        
        return () => { 
            isMounted = false; 
            if (timer) clearTimeout(timer);
        };
    }, [projectId, selectedProjectId, fetchEnvironments]);

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
