import { renderHook, act } from '@testing-library/react';
import { useRequestExecution } from './useRequestExecution';
import api from '@/shared/api';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/shared/api', () => ({
    default: {
        post: vi.fn(),
    },
}));

describe('useRequestExecution', () => {
    const mockOnHistoryUpdate = vi.fn();
    const mockAutoSave = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with default state', () => {
        const { result } = renderHook(() => useRequestExecution('env-1', mockOnHistoryUpdate));
        expect(result.current.executing).toBe(false);
        expect(result.current.lastExecution).toBeNull();
    });

    it('should execute request successfully', async () => {
        const mockResponse = { data: { id: 'exec-1', status: 200 } };
        (api.post as any).mockResolvedValue(mockResponse);

        const { result } = renderHook(() => useRequestExecution('env-1', mockOnHistoryUpdate));

        let executionResult;
        await act(async () => {
            executionResult = await result.current.handleExecute('req-1', mockAutoSave);
        });

        expect(result.current.executing).toBe(false);
        expect(result.current.lastExecution).toEqual(mockResponse.data);
        expect(executionResult).toEqual(mockResponse.data);
        expect(mockAutoSave).toHaveBeenCalled();
        expect(mockOnHistoryUpdate).toHaveBeenCalled();
        expect(api.post).toHaveBeenCalledWith('/requests/req-1/execute?environmentId=env-1');
    });

    it('should handle execution error', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        (api.post as any).mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useRequestExecution('', mockOnHistoryUpdate));

        await act(async () => {
            await result.current.handleExecute('req-1');
        });

        expect(result.current.executing).toBe(false);
        expect(result.current.lastExecution).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith('Execution failed');
        consoleSpy.mockRestore();
    });
});
