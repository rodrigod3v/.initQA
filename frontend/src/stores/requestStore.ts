import { create } from 'zustand';
import api from '../services/api';

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface ExecutionResult {
    id: string;
    status: number;
    duration: number;
    response: {
        data: any;
        headers?: any;
    };
    validationResult?: {
        valid: boolean;
        errors?: any[];
    };
    testResults?: {
        name: string;
        pass: boolean;
        error?: string;
    }[];
    createdAt?: string;
}

export interface RequestModel {
    id: string;
    name?: string;
    method: string;
    url: string;
    headers: any;
    body: any;
    testScript?: string;
    expectedResponseSchema?: any;
    executions?: ExecutionResult[];
    projectId: string;
}

interface RequestState {
    // Data
    requests: RequestModel[];
    selectedRequest: RequestModel | null;
    
    // UI States
    isLoading: boolean;
    syncStatus: SyncStatus;
    lastError: string | null;
    executing: boolean;
    lastResult: ExecutionResult | null;
    history: ExecutionResult[];

    // Actions
    fetchRequests: (projectId: string) => Promise<void>;
    selectRequest: (request: RequestModel | null) => void;
    fetchHistory: (requestId: string) => Promise<void>;
    
    // CRUD & Sync
    addRequest: (request: RequestModel) => void;
    updateLocalRequest: (id: string, updates: Partial<RequestModel>) => void;
    saveRequest: (id: string) => Promise<void>;
    deleteRequest: (id: string) => Promise<void>;
    
    // Execution
    executeRequest: (id: string, envId?: string) => Promise<void>;
    viewExecution: (execution: ExecutionResult) => void;
    clearHistory: (requestId: string) => Promise<void>;
    
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
    lastResult: null,
    history: [],

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
                 // Also fetch history for default selection
                 get().fetchHistory(response.data[0].id);
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
        if (request) {
            get().fetchHistory(request.id);
        } else {
            set({ history: [] });
        }
    },

    fetchHistory: async (requestId: string) => {
        try {
            const response = await api.get(`/requests/${requestId}/history`);
            set({ history: response.data });
        } catch (err) {
            console.error('Failed to fetch history');
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
            await get().fetchHistory(id);
            // Refresh request list to update executions count if needed
            // await get().fetchRequests(get().selectedRequest?.projectId || ''); 
        } catch (err) {
            set({ lastError: 'Execution failed' });
        } finally {
            set({ executing: false });
        }
    },

    viewExecution: (execution) => {
        set({ lastResult: execution });
    },

    clearHistory: async (requestId) => {
        try {
            await api.delete(`/requests/${requestId}/history`);
            set({ history: [] });
        } catch (err) {
            console.error('Failed to clear history');
        }
    },

    setSyncStatus: (status) => set({ syncStatus: status })
}));
