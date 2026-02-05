import { create } from 'zustand';
import api from '../services/api/index';

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

// Re-exporting interfaces to ensure type compatibility
export interface Step {
    type: string;
    selector?: string;
    value?: string;
}

export interface WebScenario {
    id: string;
    name: string;
    steps: Step[];
    projectId: string;
}

interface ScenarioState {
    // Data
    scenarios: WebScenario[];
    projectScenarios: WebScenario[]; // Scenarios filtered by project
    selectedScenario: WebScenario | null;
    
    // UI States
    isLoading: boolean;
    syncStatus: SyncStatus;
    lastError: string | null;

    // Actions
    fetchScenarios: (projectId: string) => Promise<void>;
    selectScenario: (scenario: WebScenario | null) => void;
    
    // CRUD & Sync
    addScenario: (scenario: WebScenario) => void;
    updateLocalScenario: (id: string, updates: Partial<WebScenario>) => void;
    saveScenario: (id: string) => Promise<void>; // Actual API call
    deleteScenario: (id: string) => Promise<void>;
    
    // Helpers
    setSyncStatus: (status: SyncStatus) => void;
}

// Debounce timer reference outside store to avoid state updates
let saveTimeout: any = null;

export const useScenarioStore = create<ScenarioState>((set, get) => ({
    scenarios: [],
    projectScenarios: [],
    selectedScenario: null,
    isLoading: false,
    syncStatus: 'idle',
    lastError: null,

    fetchScenarios: async (projectId: string) => {
        set({ isLoading: true });
        try {
            const response = await api.get(`/web-scenarios?projectId=${projectId}`);
            set({ 
                scenarios: response.data,
                projectScenarios: response.data, // For now assuming simple filtering
                isLoading: false,
                lastError: null
            });
        } catch (error) {
            set({ 
                isLoading: false, 
                lastError: 'Failed to fetch scenarios' 
            });
        }
    },

    selectScenario: (scenario) => set({ selectedScenario: scenario, syncStatus: 'idle' }),

    addScenario: (scenario) => {
        set((state) => ({
            scenarios: [scenario, ...state.scenarios],
            selectedScenario: scenario,
            syncStatus: 'saved'
        }));
    },

    updateLocalScenario: (id, updates) => {
        // Optimistic update
        set((state) => {
            const updatedScenarios = state.scenarios.map(s => 
                s.id === id ? { ...s, ...updates } : s
            );
            
            // Also update selected if it's the one being modified
            const updatedSelected = state.selectedScenario?.id === id 
                ? { ...state.selectedScenario, ...updates } 
                : state.selectedScenario;

            return {
                scenarios: updatedScenarios,
                selectedScenario: updatedSelected,
                syncStatus: 'saving' // Set to saving immediately to verify visual feedback
            };
        });

        // Debounced Save
        if (saveTimeout) clearTimeout(saveTimeout);
        
        saveTimeout = setTimeout(async () => {
            await get().saveScenario(id);
        }, 1000); // 1 second debounce
    },

    saveScenario: async (id) => {
        const scenario = get().scenarios.find(s => s.id === id);
        if (!scenario) return;

        set({ syncStatus: 'saving' });
        try {
            await api.patch(`/web-scenarios/${id}`, {
                name: scenario.name,
                steps: scenario.steps
            });
            set({ syncStatus: 'saved', lastError: null });
            
            // Reset to 'idle' after 2 seconds to hide the "Saved" badge gracefully
            setTimeout(() => {
                // Only reset if still 'saved' (user didn't make new edits)
                if (get().syncStatus === 'saved') {
                    set({ syncStatus: 'idle' });
                }
            }, 2000);
            
        } catch (error) {
            console.error('Save failed', error);
            set({ syncStatus: 'error', lastError: 'Failed to save changes' });
            // Retry logic could go here or be triggered manually by user
        }
    },

    deleteScenario: async (id) => {
        try {
            await api.delete(`/web-scenarios/${id}`);
            set((state) => ({
                scenarios: state.scenarios.filter(s => s.id !== id),
                selectedScenario: state.selectedScenario?.id === id ? null : state.selectedScenario
            }));
        } catch (error) {
            set({ lastError: 'Failed to delete scenario' });
        }
    },

    setSyncStatus: (status) => set({ syncStatus: status })
}));
