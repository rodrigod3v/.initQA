import client from '@/shared/api/client';
import type { RequestModel, ExecutionResult } from '@/shared/types/api';

export const RequestService = {
    async findAll(projectId?: string): Promise<RequestModel[]> {
        const response = await client.get(projectId ? `/requests?projectId=${projectId}` : '/requests');
        return response.data;
    },

    async findOne(id: string): Promise<RequestModel> {
        const response = await client.get(`/requests/${id}`);
        return response.data;
    },

    async create(data: Partial<RequestModel>): Promise<RequestModel> {
        const response = await client.post('/requests', data);
        return response.data;
    },

    async update(id: string, data: Partial<RequestModel>): Promise<RequestModel> {
        const response = await client.patch(`/requests/${id}`, data);
        return response.data;
    },

    async delete(id: string): Promise<void> {
        await client.delete(`/requests/${id}`);
    },

    async execute(id: string, environmentId?: string): Promise<ExecutionResult> {
        const response = await client.post(`/requests/${id}/execute`, { environmentId });
        return response.data;
    },

    async getProjectHistory(projectId: string): Promise<ExecutionResult[]> {
        const response = await client.get(`/requests/project-history/${projectId}`);
        return response.data;
    },

    async clearProjectHistory(projectId: string): Promise<void> {
        await client.delete(`/requests/project-history/${projectId}`);
    }
};

export default RequestService;
