import { create } from 'zustand';
import { ProjectService } from '@/services/ProjectService';

export interface Project {
    id: string;
    name: string;
    createdAt: string;
}

interface ProjectState {
    projects: Project[];
    selectedProject: Project | null;
    isLoading: boolean;
    error: string | null;

    fetchProjects: () => Promise<void>;
    createProject: (name: string) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    selectProject: (project: Project | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
    projects: [],
    selectedProject: null,
    isLoading: false,
    error: null,

    fetchProjects: async () => {
        set({ isLoading: true, error: null });
        try {
            const data = await ProjectService.findAll();
            set({ projects: data, isLoading: false });
        } catch (error) {
            set({ error: 'Failed to fetch projects', isLoading: false });
        }
    },

    createProject: async (name: string) => {
        set({ isLoading: true, error: null });
        try {
            const data = await ProjectService.create(name);
            set((state) => ({
                projects: [...state.projects, data],
                isLoading: false
            }));
        } catch (error) {
            set({ error: 'Failed to create project', isLoading: false });
            throw error;
        }
    },

    deleteProject: async (id: string) => {
        try {
            await ProjectService.delete(id);
            set((state) => ({
                projects: state.projects.filter(p => p.id !== id),
                error: null
            }));
        } catch (error) {
            set({ error: 'Failed to delete project' });
            throw error;
        }
    },

    selectProject: (project) => {
        set({ selectedProject: project });
    }
}));
