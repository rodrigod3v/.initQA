import client from '@/shared/api/client';
import type { Project } from '@/stores/projectStore';

export const ProjectService = {
    async findAll(): Promise<Project[]> {
        const response = await client.get('/projects');
        return response.data;
    },

    async create(name: string): Promise<Project> {
        const response = await client.post('/projects', { name });
        return response.data;
    },

    async delete(id: string): Promise<void> {
        await client.delete(`/projects/${id}`);
    }
};

export default ProjectService;
