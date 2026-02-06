import client from '@/shared/api/client';
import type { WebScenario } from '@/stores/scenarioStore';

export const ScenarioService = {
    async findAll(projectId: string): Promise<WebScenario[]> {
        const response = await client.get(`/web-scenarios?projectId=${projectId}`);
        return response.data;
    },

    async update(id: string, data: Partial<WebScenario>): Promise<WebScenario> {
        const response = await client.patch(`/web-scenarios/${id}`, {
            name: data.name,
            steps: data.steps
        });
        return response.data;
    },

    async delete(id: string): Promise<void> {
        await client.delete(`/web-scenarios/${id}`);
    }
};

export default ScenarioService;
