import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScenarioService } from './ScenarioService';
import client from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
    default: {
        get: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    },
}));

describe('ScenarioService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('findAll calls client.get with projectId', async () => {
        const mockData = [{ id: '1', name: 'Scenario A' }];
        (client.get as any).mockResolvedValue({ data: mockData });

        const result = await ScenarioService.findAll('proj-1');

        expect(client.get).toHaveBeenCalledWith('/web-scenarios?projectId=proj-1');
        expect(result).toEqual(mockData);
    });

    it('update calls client.patch with transformed data', async () => {
        const mockData = { name: 'Updated', steps: [] };
        const mockResponse = { id: '1', ...mockData };
        (client.patch as any).mockResolvedValue({ data: mockResponse });

        const result = await ScenarioService.update('1', mockData);

        expect(client.patch).toHaveBeenCalledWith('/web-scenarios/1', {
            name: mockData.name,
            steps: mockData.steps
        });
        expect(result).toEqual(mockResponse);
    });

    it('delete calls client.delete', async () => {
        (client.delete as any).mockResolvedValue({});

        await ScenarioService.delete('1');

        expect(client.delete).toHaveBeenCalledWith('/web-scenarios/1');
    });
});
