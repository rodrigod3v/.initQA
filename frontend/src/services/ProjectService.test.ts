import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectService } from './ProjectService';
import client from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    },
}));

describe('ProjectService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('findAll calls client.get', async () => {
        const mockData = [{ id: '1', name: 'Project A' }];
        (client.get as any).mockResolvedValue({ data: mockData });

        const result = await ProjectService.findAll();

        expect(client.get).toHaveBeenCalledWith('/projects');
        expect(result).toEqual(mockData);
    });

    it('create calls client.post with name', async () => {
        const mockData = { id: '1', name: 'New Project' };
        (client.post as any).mockResolvedValue({ data: mockData });

        const result = await ProjectService.create('New Project');

        expect(client.post).toHaveBeenCalledWith('/projects', { name: 'New Project' });
        expect(result).toEqual(mockData);
    });

    it('delete calls client.delete', async () => {
        (client.delete as any).mockResolvedValue({});

        await ProjectService.delete('1');

        expect(client.delete).toHaveBeenCalledWith('/projects/1');
    });
});
