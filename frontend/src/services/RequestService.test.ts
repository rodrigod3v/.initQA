import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequestService } from './RequestService';
import client from '@/shared/api/client';

// Mock the axios client
vi.mock('@/shared/api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    },
}));

describe('RequestService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('findAll calls client.get with correct url', async () => {
        const mockData = [{ id: '1', name: 'Test Request' }];
        vi.mocked(client.get).mockResolvedValue({ data: mockData });

        const result = await RequestService.findAll('proj-1');
        
        expect(client.get).toHaveBeenCalledWith('/requests?projectId=proj-1');
        expect(result).toEqual(mockData);
    });

    it('findAll calls client.get without projectId', async () => {
        await RequestService.findAll();
        expect(client.get).toHaveBeenCalledWith('/requests');
    });

    it('findOne calls client.get with correct url', async () => {
        const mockData = { id: '1', name: 'Test Request' };
        vi.mocked(client.get).mockResolvedValue({ data: mockData });

        const result = await RequestService.findOne('1');
        
        expect(client.get).toHaveBeenCalledWith('/requests/1');
        expect(result).toEqual(mockData);
    });

    it('create calls client.post with data', async () => {
        const mockData = { name: 'New Request' };
        vi.mocked(client.post).mockResolvedValue({ data: { id: '1', ...mockData } });

        const result = await RequestService.create(mockData);

        expect(client.post).toHaveBeenCalledWith('/requests', mockData);
        expect(result).toEqual({ id: '1', ...mockData });
    });

    it('update calls client.patch with data', async () => {
        const mockData = { name: 'Updated Request' };
        vi.mocked(client.patch).mockResolvedValue({ data: { id: '1', ...mockData } });

        const result = await RequestService.update('1', mockData);

        expect(client.patch).toHaveBeenCalledWith('/requests/1', mockData);
        expect(result).toEqual({ id: '1', ...mockData });
    });

    it('delete calls client.delete', async () => {
        vi.mocked(client.delete).mockResolvedValue({});

        await RequestService.delete('1');

        expect(client.delete).toHaveBeenCalledWith('/requests/1');
    });

    it('execute calls client.post with environmentId', async () => {
        const mockResponse = { status: 200, data: 'OK' };
        vi.mocked(client.post).mockResolvedValue({ data: mockResponse });

        const result = await RequestService.execute('1', 'env-1');

        expect(client.post).toHaveBeenCalledWith('/requests/1/execute', { environmentId: 'env-1' });
        expect(result).toEqual(mockResponse);
    });

    it('getProjectHistory calls client.get with correct url', async () => {
        const mockData = [{ id: 'hist-1' }];
        vi.mocked(client.get).mockResolvedValue({ data: mockData });

        const result = await RequestService.getProjectHistory('proj-1');

        expect(client.get).toHaveBeenCalledWith('/requests/project-history/proj-1');
        expect(result).toEqual(mockData);
    });

    it('clearProjectHistory calls client.delete with correct url', async () => {
        vi.mocked(client.delete).mockResolvedValue({});

        await RequestService.clearProjectHistory('proj-1');

        expect(client.delete).toHaveBeenCalledWith('/requests/project-history/proj-1');
    });
});
