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
        } catch {
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
        } catch {
            set({ error: 'Failed to create project', isLoading: false });
            // re-throw is fine if needed, but the original catch had (error) which was unused except for re-throw
        }
    },

    deleteProject: async (id: string) => {
        try {
            await ProjectService.delete(id);
            set((state) => ({
                projects: state.projects.filter(p => p.id !== id),
                error: null
            }));
        } catch {
            set({ error: 'Failed to delete project' });
        }
    },

    selectProject: (project) => {
        set({ selectedProject: project });
    }
}));
