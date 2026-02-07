import { renderHook, waitFor } from '@testing-library/react';
import { useRequestHistory } from './useRequestHistory';
import api from '@/shared/api';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/shared/api', () => ({
    default: {
        get: vi.fn(),
    },
}));

describe('useRequestHistory', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch history on mount if projectId provided', async () => {
        const mockHistory = [{ id: '1' }, { id: '2' }];
        vi.mocked(api.get).mockResolvedValue({ data: mockHistory });

        const { result } = renderHook(() => useRequestHistory('proj-1'));

        await waitFor(() => {
            expect(result.current.projectHistory).toEqual(mockHistory);
        });

        expect(api.get).toHaveBeenCalledWith('/requests/project-history/proj-1');
    });

    it('should not fetch history if projectId missing', () => {
        const { result } = renderHook(() => useRequestHistory());
        expect(api.get).not.toHaveBeenCalled();
        expect(result.current.projectHistory).toEqual([]);
    });

    it('should handle fetch error', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(api.get).mockRejectedValue(new Error('Failed'));

        renderHook(() => useRequestHistory('proj-1'));

        await waitFor(() => {
             expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch request history');
        });
        
        consoleSpy.mockRestore();
    });

    it('should expose fetchProjectHistory for manual refresh', async () => {
         const mockHistory = [{ id: 'new' }];
        vi.mocked(api.get).mockResolvedValue({ data: mockHistory });

        const { result } = renderHook(() => useRequestHistory('proj-1'));

        // First call automatic
        expect(api.get).toHaveBeenCalledTimes(1); 

        // Manual call
        await result.current.fetchProjectHistory();

        expect(api.get).toHaveBeenCalledTimes(2);
         await waitFor(() => {
            expect(result.current.projectHistory).toEqual(mockHistory);
        });
    });
});
