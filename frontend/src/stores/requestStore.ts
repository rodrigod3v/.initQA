import { create } from 'zustand';
import api from '@/shared/api';

import type { RequestModel, ExecutionResult } from '@/shared/types/api';
export type { RequestModel, ExecutionResult };

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

interface RequestState {
    // Data
    requests: RequestModel[];
    selectedRequest: RequestModel | null;

    // UI States
    isLoading: boolean;
    syncStatus: SyncStatus;
    lastError: string | null;
    executing: boolean;
    batchExecuting: boolean;
    runningRequests: Set<string>;
    lastResult: ExecutionResult | null;
    projectHistory: ExecutionResult[];

    // Actions
    fetchRequests: (projectId: string) => Promise<void>;
    selectRequest: (request: RequestModel | null) => void;
    fetchProjectHistory: (projectId: string) => Promise<void>;

    // CRUD & Sync
    addRequest: (request: RequestModel) => void;
    updateLocalRequest: (id: string, updates: Partial<RequestModel>) => void;
    saveRequest: (id: string) => Promise<void>;
    deleteRequest: (id: string) => Promise<void>;

    // Execution
    executeRequest: (id: string, envId?: string) => Promise<void>;
    batchExecute: (projectId: string, envId?: string) => Promise<void>;
    viewExecution: (execution: ExecutionResult) => void;
    clearProjectHistory: (projectId: string) => Promise<void>;

    // Helpers
    setSyncStatus: (status: SyncStatus) => void;
}

// Debounce timer reference
let saveTimeout: any = null;

export const useRequestStore = create<RequestState>((set, get) => ({
    requests: [],
    selectedRequest: null,
    isLoading: false,
    syncStatus: 'idle',
    lastError: null,
    executing: false,
    batchExecuting: false,
    runningRequests: new Set(),
    lastResult: null,
    projectHistory: [],

    fetchRequests: async (projectId: string) => {
        set({ isLoading: true });
        try {
            const response = await api.get(projectId ? `/requests?projectId=${projectId}` : '/requests');
            set({
                requests: response.data,
                isLoading: false,
                lastError: null
            });

            // Re-select if we have a selection to keep it fresh
            const currentSelected = get().selectedRequest;
            if (currentSelected) {
                const found = response.data.find((r: RequestModel) => r.id === currentSelected.id);
                if (found) set({ selectedRequest: found });
            } else if (response.data.length > 0) {
                set({ selectedRequest: response.data[0] });
            }

        } catch (error) {
            set({
                isLoading: false,
                lastError: 'Failed to fetch requests'
            });
        }
    },

    selectRequest: (request) => {
        set({ selectedRequest: request, lastResult: null, syncStatus: 'idle' });
    },


    fetchProjectHistory: async (projectId: string) => {
        try {
            const response = await api.get(`/requests/project-history/${projectId}`);
            set({ projectHistory: response.data });
        } catch (err) {
            console.error('Failed to fetch project history');
        }
    },

    addRequest: (request) => {
        set((state) => ({
            requests: [...state.requests, request],
            selectedRequest: request,
            syncStatus: 'saved'
        }));
    },

    updateLocalRequest: (id, updates) => {
        // Optimistic update
        set((state) => {
            const updatedRequests = state.requests.map(r =>
                r.id === id ? { ...r, ...updates } : r
            );

            // Update selected if needed
            const updatedSelected = state.selectedRequest?.id === id
                ? { ...state.selectedRequest, ...updates }
                : state.selectedRequest;

            return {
                requests: updatedRequests,
                selectedRequest: updatedSelected as RequestModel, // Cast to avoid TS issues with Partial
                syncStatus: 'saving'
            };
        });

        // Debounced Save
        if (saveTimeout) clearTimeout(saveTimeout);

        saveTimeout = setTimeout(async () => {
            await get().saveRequest(id);
        }, 1000);
    },

    saveRequest: async (id) => {
        const request = get().requests.find(r => r.id === id);
        if (!request) return;

        set({ syncStatus: 'saving' });
        try {
            const { id: reqId, projectId, executions, ...data } = request;

            // Clean up JSON fields before sending if they are strings
            const payload = { ...data };
            try { if (typeof payload.body === 'string') payload.body = JSON.parse(payload.body); } catch (e) { }
            try { if (typeof payload.headers === 'string') payload.headers = JSON.parse(payload.headers); } catch (e) { }
            try { if (typeof payload.expectedResponseSchema === 'string') payload.expectedResponseSchema = JSON.parse(payload.expectedResponseSchema); } catch (e) { }

            await api.patch(`/requests/${id}`, payload);
            set({ syncStatus: 'saved', lastError: null });

            setTimeout(() => {
                if (get().syncStatus === 'saved') {
                    set({ syncStatus: 'idle' });
                }
            }, 2000);

        } catch (error) {
            console.error('Save failed', error);
            set({ syncStatus: 'error', lastError: 'Failed to save changes' });
        }
    },

    deleteRequest: async (id) => {
        try {
            await api.delete(`/requests/${id}`);
            set((state) => {
                const newRequests = state.requests.filter(r => r.id !== id);
                return {
                    requests: newRequests,
                    selectedRequest: newRequests.length > 0 ? newRequests[0] : null
                };
            });
        } catch (error) {
            set({ lastError: 'Failed to delete request' });
        }
    },

    executeRequest: async (id, envId) => {
        set({ executing: true, lastResult: null });

        // Auto-save first
        await get().saveRequest(id);

        try {
            const response = await api.post(`/requests/${id}/execute`, {
                environmentId: envId
            });
            set({ lastResult: response.data });

            // Refresh project-wide history
            const projectId = get().requests.find(r => r.id === id)?.projectId;
            if (projectId) {
                await get().fetchProjectHistory(projectId);
            }
        } catch (err) {
            set({ lastError: 'Execution failed' });
        } finally {
            set({ executing: false });
        }
    },

    batchExecute: async (projectId, envId) => {
        const requests = get().requests;
        const pId = projectId || get().selectedRequest?.projectId;
        if (requests.length === 0 || !pId) {
            console.warn('Batch execution skipped: No requests or project ID');
            return;
        }

        set({
            batchExecuting: true,
            runningRequests: new Set(requests.map(r => r.id)),
            lastError: null
        });

        try {
            console.log(`[STORE] Starting batch execution for project ${pId}...`);

            // Sequential execution for SQLite reliability
            for (const req of requests) {
                try {
                    // Auto-save before execution
                    await get().saveRequest(req.id);

                    // Stability delay
                    await new Promise(resolve => setTimeout(resolve, 500));

                    const response = await api.post(`/requests/${req.id}/execute`, { environmentId: envId });
                    console.log(`[STORE] Executed ${req.name}: Status ${response.status}`);

                    // Update running state
                    set(state => {
                        const newRunning = new Set(state.runningRequests);
                        newRunning.delete(req.id);
                        return { runningRequests: newRunning };
                    });

                    await get().fetchProjectHistory(pId);
                } catch (e: any) {
                    console.error(`[STORE] Failed to run request ${req.name}:`, e.message);
                    set(state => {
                        const newRunning = new Set(state.runningRequests);
                        newRunning.delete(req.id);
                        return { runningRequests: newRunning };
                    });
                }
            }

            console.log('[STORE] Batch execution complete.');
        } catch (err: any) {
            console.error('[STORE] Batch execution CRITICAL failure:', err);
            set({ lastError: 'Batch execution failed: ' + err.message });
        } finally {
            set({ batchExecuting: false, runningRequests: new Set() });
            // Final refresh to be sure
            await get().fetchProjectHistory(pId);
        }
    },

    viewExecution: (execution) => {
        set({ lastResult: execution });
    },


    clearProjectHistory: async (projectId: string) => {
        try {
            await api.delete(`/requests/project-history/${projectId}`);
            set({ projectHistory: [] });
        } catch (err) {
            console.error('Failed to clear project history');
        }
    },

    setSyncStatus: (status) => set({ syncStatus: status })
}));
