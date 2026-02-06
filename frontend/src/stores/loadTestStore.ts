import { create } from 'zustand';
import api from '@/shared/api';

export interface LoadTest {
    id: string;
    name: string;
    config: {
        targetUrl: string;
        vus?: number;
        duration?: string;
        thresholdMs?: number;
        stages?: { duration: string; target: number }[];
    };
    projectId: string;
}

interface LoadTestState {
    tests: LoadTest[];
    selectedTest: LoadTest | null;
    isLoading: boolean;
    isExecuting: boolean;
    lastResult: any | null;
    history: any[];
    error: string | null;

    fetchTests: (projectId: string) => Promise<void>;
    fetchHistory: (testId: string) => Promise<void>;
    createTest: (test: Partial<LoadTest>) => Promise<void>;
    updateTest: (id: string, updates: Partial<LoadTest>) => Promise<void>;
    executeTest: (id: string, envId?: string) => Promise<void>;
    deleteTest: (id: string) => Promise<void>;
    clearHistory: (id: string) => Promise<void>;
    selectTest: (test: LoadTest | null) => void;
    setLastExecution: (result: any) => void;
}

export const useLoadTestStore = create<LoadTestState>((set, get) => ({
    tests: [],
    selectedTest: null,
    isLoading: false,
    isExecuting: false,
    lastResult: null,
    history: [],
    error: null,

    fetchTests: async (projectId: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.get(`/load-tests?projectId=${projectId}`);
            set({ tests: response.data, isLoading: false });

            // Re-select logic
            const current = get().selectedTest;
            if (current && response.data.find((t: LoadTest) => t.id === current.id)) {
                // Keep selection
            } else if (response.data.length > 0 && !current) {
                set({ selectedTest: response.data[0] });
                get().fetchHistory(response.data[0].id);
            }
        } catch (err) {
            set({ error: 'Failed to fetch usage tests', isLoading: false });
        }
    },

    fetchHistory: async (testId: string) => {
        try {
            const response = await api.get(`/load-tests/${testId}/history`);
            set({ history: response.data });
        } catch (err) {
            console.error('Failed to fetch history');
        }
    },

    createTest: async (test) => {
        try {
            const response = await api.post('/load-tests', test);
            set(state => ({
                tests: [...state.tests, response.data],
                selectedTest: response.data
            }));
        } catch (err) {
            set({ error: 'Failed to create test' });
            throw err;
        }
    },

    updateTest: async (id: string, updates: Partial<LoadTest>) => {
        try {
            // Optimistic update
            set(state => ({
                tests: state.tests.map(t => t.id === id ? { ...t, ...updates } : t),
                selectedTest: state.selectedTest?.id === id ? { ...state.selectedTest, ...updates } as LoadTest : state.selectedTest
            }));

            await api.patch(`/load-tests/${id}`, updates);
        } catch (err) {
            set({ error: 'Failed to update test' });
            // Revert would be nice here but keeping it simple for now
        }
    },

    executeTest: async (id: string, envId?: string) => {
        set({ isExecuting: true, error: null });
        try {
            const response = await api.post(`/load-tests/${id}/execute${envId ? `?environmentId=${envId}` : ''}`);
            set({ lastResult: response.data, isExecuting: false });
            get().fetchHistory(id);
        } catch (err) {
            set({ isExecuting: false, error: 'Execution failed' });
        }
    },

    deleteTest: async (id) => {
        try {
            await api.delete(`/load-tests/${id}`);
            set(state => ({
                tests: state.tests.filter(t => t.id !== id),
                selectedTest: state.selectedTest?.id === id ? (state.tests.find(t => t.id !== id) || null) : state.selectedTest
            }));
        } catch (err) {
            set({ error: 'Failed to delete test' });
        }
    },

    clearHistory: async (id) => {
        try {
            await api.delete(`/load-tests/${id}/history`);
            if (get().selectedTest?.id === id) {
                set({ history: [], lastResult: null });
            }
        } catch (err) {
            console.error('Failed to clear history');
        }
    },

    selectTest: (test) => {
        set({ selectedTest: test, lastResult: null });
        if (test) {
            get().fetchHistory(test.id);
        }
    },

    setLastExecution: (result) => set({ lastResult: result })
}));
