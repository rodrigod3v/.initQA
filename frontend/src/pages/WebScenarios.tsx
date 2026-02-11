import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '@/shared/api';
import {
    Plus,
    Play,
    Loader2,
    Globe,
    Monitor,
    X,
    CheckCircle2,
    XCircle,
    Activity,
    Image as ImageIcon,
    RefreshCw,
    MousePointer2,
    TextCursorInput,
    ExternalLink,
    Anchor,
    Clock,
    MoveDown,
    CheckSquare,
    Square,
    ChevronDown,
    ChevronUp,
    EyeOff,
    Target,
    Code2,
    Trash2,
    Edit2,
    Sparkles,
    Layers,
    Zap,
    BrainCircuit,
    Pause,
    StopCircle,
    MessageSquare
} from 'lucide-react';

import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Tabs } from '@/shared/ui/Tabs';

import { useProjectStore } from '@/stores/projectStore';
import { useScenarioStore, type WebScenario, type Step } from '@/stores/scenarioStore';
import { useProjectMetadata } from '@/features/webScenario/hooks/useProjectMetadata';
import { useWebScenarioHistory } from '@/features/webScenario/hooks/useWebScenarioHistory';
import { useWebScenarioExecution } from '@/features/webScenario/hooks/useWebScenarioExecution';
import type { ExecutionResult } from '@/shared/types/api';

import { ToastContainer, type ToastMessage } from '@/shared/ui/Toast';
import { socketService, type HealingEvent } from '@/services/socket.service';
import VisualBuilder from '@/features/webScenario/VisualBuilder/VisualBuilder';
import ScenarioHeatmap from '@/features/webScenario/Analytics/ScenarioHeatmap';

const WebScenarios: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();

    // Store Hooks
    const selectProject = useProjectStore(state => state.selectProject);

    // Store State - Optimized Subscriptions
    const scenarios = useScenarioStore(state => state.scenarios);
    const selectedScenario = useScenarioStore(state => state.selectedScenario);
    const isLoading = useScenarioStore(state => state.isLoading);
    const syncStatus = useScenarioStore(state => state.syncStatus);

    const fetchScenarios = useScenarioStore(state => state.fetchScenarios);
    const selectScenario = useScenarioStore(state => state.selectScenario);
    const addScenario = useScenarioStore(state => state.addScenario);
    const updateLocalScenario = useScenarioStore(state => state.updateLocalScenario);
    const saveScenario = useScenarioStore(state => state.saveScenario);
    const deleteScenario = useScenarioStore(state => state.deleteScenario);

    // Custom Hooks
    const {
        projects,
        environments,
        selectedEnvId,
        setSelectedEnvId,
        selectedProjectId,
        setSelectedProjectId,
        fetchProjects
    } = useProjectMetadata(projectId);

    const effectiveProjectId = projectId || selectedProjectId;

    const {
        projectHistory,
        scenarioHistory,
        fetchProjectHistory,
        clearProjectHistory
    } = useWebScenarioHistory(effectiveProjectId, selectedScenario?.id);

    const {
        batchExecuting,
        runningScenarios,
        handleRunAll: runAll,
    } = useWebScenarioExecution(selectedEnvId, fetchProjectHistory);

    // Local State
    const [executing, setExecuting] = useState(false);
    const [lastExecution, setLastExecution] = useState<ExecutionResult | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingUrl, setRecordingUrl] = useState('');
    const [showRecordModal, setShowRecordModal] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newScenarioName, setNewScenarioName] = useState('');
    const [scenarioToEdit, setScenarioToEdit] = useState<WebScenario | null>(null);
    const [scenarioToDelete, setScenarioToDelete] = useState<WebScenario | null>(null);
    const [showClearStepsModal, setShowClearStepsModal] = useState(false);
    const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
    const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
    const [scriptContent, setScriptContent] = useState('');
    const [activeTab, setActiveTab] = useState<'results' | 'activity' | 'insights' | 'brain'>('results');
    const [viewMode, setViewMode] = useState<'code' | 'visual'>('code');
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [executionProgress, setExecutionProgress] = useState<{ current: number; total: number; type: string } | null>(null);
    const [executionState, setExecutionState] = useState<'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED'>('IDLE');
    const [isMappingBrain, setIsMappingBrain] = useState(false);
    const [brainScript, setBrainScript] = useState('');
    const [mappingUrl, setMappingUrl] = useState('');
    const [mappingStatus, setMappingStatus] = useState<{ status: string; pagesMapped?: number; error?: string } | null>(null);

    const handlePause = async () => {
        if (!selectedScenario) return;
        try {
            await api.post(`/web-scenarios/${selectedScenario.id}/pause`);
            setExecutionState('PAUSED');
        } catch (err) {
            console.error('Pause failed', err);
        }
    };

    const handleResume = async () => {
        if (!selectedScenario) return;
        try {
            await api.post(`/web-scenarios/${selectedScenario.id}/resume`);
            setExecutionState('RUNNING');
        } catch (err) {
            console.error('Resume failed', err);
        }
    };

    const handleStop = async () => {
        if (!selectedScenario) return;
        try {
            await api.post(`/web-scenarios/${selectedScenario.id}/stop`);
            setExecutionState('IDLE');
            setExecuting(false);
        } catch (err) {
            console.error('Stop failed', err);
        }
    };

    const startSemanticMapping = async () => {
        if (!mappingUrl || !effectiveProjectId) return;
        setIsMappingBrain(true);
        try {
            await api.post('/cartographer/map', {
                projectId: effectiveProjectId,
                url: mappingUrl
            });
            const newToast: ToastMessage = {
                id: Date.now().toString(),
                type: 'success',
                title: 'Brain Mapping Complete',
                message: 'Topology mapped and elements archived in GlobalElementMap',
                duration: 5000
            };
            setToasts(prev => [...prev, newToast]);
        } catch (err) {
            console.error('Mapping failed', err);
        } finally {
            setIsMappingBrain(false);
        }
    };

    const generateOracleScript = async () => {
        if (!effectiveProjectId) return;
        try {
            const response = await api.get(`/cartographer/generate-script/${effectiveProjectId}`);
            setBrainScript(response.data);
        } catch (err) {
            console.error('Oracle failed', err);
        }
    };

    const generateOracleJSON = async () => {
        if (!effectiveProjectId || !selectedScenario) return;
        try {
            const response = await api.get(`/cartographer/generate-scenarios/${effectiveProjectId}`);
            const data = response.data;

            if (data && data.scenarios && Array.isArray(data.scenarios)) {
                // Flatten all scenarios into steps with COMMENT separators
                const allSteps: Step[] = [];

                data.scenarios.forEach((scenario: any, index: number) => {
                    // Add COMMENT separator before each scenario (except first if no existing steps)
                    if (index > 0 || (selectedScenario.steps && selectedScenario.steps.length > 0)) {
                        allSteps.push({
                            type: 'COMMENT',
                            value: `--- ${scenario.name} ---`,
                            metadata: {
                                generated: true,
                                description: scenario.description
                            }
                        } as Step);
                    }

                    // Add scenario steps
                    if (scenario.steps && Array.isArray(scenario.steps)) {
                        allSteps.push(...scenario.steps);
                    }
                });

                const combinedSteps = [...(selectedScenario.steps || []), ...allSteps];
                updateLocalScenario(selectedScenario.id, { steps: combinedSteps });

                const newToast: ToastMessage = {
                    id: Date.now().toString(),
                    type: 'success',
                    title: 'Oracle Scenarios Generated',
                    message: `Added ${data.scenarios.length} test scenarios (${allSteps.length} total steps)`,
                    duration: 5000
                };
                setToasts(prev => [...prev, newToast]);
            }
        } catch (err) {
            console.error('Oracle Scenarios failed', err);
            const errorToast: ToastMessage = {
                id: Date.now().toString(),
                type: 'error',
                title: 'Oracle Failed',
                message: 'Failed to generate test scenarios',
                duration: 5000
            };
            setToasts(prev => [...prev, errorToast]);
        }
    };

    useEffect(() => {
        socketService.connect();
        return () => socketService.disconnect();
    }, []);

    useEffect(() => {
        if (effectiveProjectId) {
            socketService.onMappingStatus(effectiveProjectId, (data) => {
                setMappingStatus(data);
                if (data.status === 'MAPPING_SUCCESS') {
                    const newToast: ToastMessage = {
                        id: Date.now().toString(),
                        type: 'success',
                        title: 'Brain Mapping Complete',
                        message: `Successfully mapped ${data.pagesMapped} pages`,
                        duration: 5000
                    };
                    setToasts(prev => [...prev, newToast]);
                } else if (data.status === 'MAPPING_FAILED') {
                    const newToast: ToastMessage = {
                        id: Date.now().toString(),
                        type: 'error',
                        title: 'Brain Mapping Failed',
                        message: data.error || 'Unknown error',
                        duration: 5000
                    };
                    setToasts(prev => [...prev, newToast]);
                }
            });
            return () => socketService.offMappingStatus(effectiveProjectId);
        }
    }, [effectiveProjectId]);

    useEffect(() => {
        if (selectedScenario) {
            socketService.onHealing(selectedScenario.id, (data: HealingEvent) => {
                const newToast: ToastMessage = {
                    id: Date.now().toString(),
                    type: 'success',
                    title: 'Self-Healing Activated',
                    message: `Healed via ${data.method} (Score: ${data.score})`,
                    duration: 5000
                };
                setToasts(prev => [...prev, newToast]);
            });

            socketService.onProgress(selectedScenario.id, (data) => {
                setExecutionProgress(data);
            });

            socketService.onStatus(selectedScenario.id, (data: { status: any }) => {
                setExecutionState(data.status);
                if (data.status === 'IDLE' || data.status === 'STOPPED') {
                    setExecuting(false);
                }
            });

            return () => {
                socketService.offHealing(selectedScenario.id);
                socketService.offProgress(selectedScenario.id);
                socketService.offStatus(selectedScenario.id);
            };
        }
    }, [selectedScenario]);

    useEffect(() => {
        if (isRecording && selectedScenario) {
            const sessionId = localStorage.getItem('initqa_recording_session');
            if (sessionId) {
                socketService.onRecorderStop(sessionId, (data) => {
                    if (data.steps && data.steps.length > 0) {
                        const newSteps = [...(selectedScenario.steps || []), ...data.steps.map((s: any) => ({
                            type: s.type,
                            selector: s.selector,
                            value: s.value
                        }))];
                        updateLocalScenario(selectedScenario.id, { steps: newSteps });
                    }
                    setIsRecording(false);
                    localStorage.removeItem('initqa_recording_session');
                });
                return () => {
                    socketService.offRecorderStop(sessionId);
                };
            }
        }
    }, [isRecording, selectedScenario, updateLocalScenario]);

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    useEffect(() => {
        if (projectId) {
            fetchScenarios(projectId);

            // Sync selected project in store for Sidebar context
            const syncProject = async () => {
                const project = projects.find(p => p.id === projectId);
                if (project) {
                    selectProject(project);
                } else if (projects.length === 0) {
                    await fetchProjects();
                }
            };
            syncProject();
        }
    }, [projectId, fetchScenarios, projects, selectProject, fetchProjects]);

    const handleStartRecording = async () => {
        if (!recordingUrl) return;

        try {
            setIsRecording(true);
            setShowRecordModal(false);
            const sessionId = Math.random().toString(36).substring(7);
            localStorage.setItem('initqa_recording_session', sessionId);

            await api.post(`/web-scenarios/recorder/start`, { // Changed axios to api
                url: recordingUrl,
                sessionId
            });
        } catch {
            console.error('Failed to start recording');
            setIsRecording(false);
        }
    };

    const handleStopRecording = async () => {
        const sessionId = localStorage.getItem('initqa_recording_session');
        if (!sessionId) return;

        try {
            const response = await api.post(`/web-scenarios/recorder/stop/${sessionId}`); // Changed axios to api
            const recordedSteps = response.data;

            if (recordedSteps && recordedSteps.length > 0) {
                // Map recorded steps to scenario format
                const newSteps = [...(selectedScenario?.steps || []), ...recordedSteps.map((s: Step) => ({
                    type: s.type,
                    selector: s.selector,
                    value: s.value
                }))];

                await updateLocalScenario(selectedScenario!.id, { steps: newSteps });
            }
        } catch {
            console.error('Failed to stop recording');
        } finally {
            setIsRecording(false);
            localStorage.removeItem('initqa_recording_session');
        }
    };

    useEffect(() => {
        // ... existing cleanup if needed
    }, []);
    useEffect(() => {
        if (selectedScenario) {
            setLastExecution(null);
        }
    }, [selectedScenario]);

    const handleRunAll = async () => {
        await runAll(scenarios);
        setActiveTab('activity');
    };

    const handleEditClick = (e: React.MouseEvent, scenario: WebScenario) => {
        e.stopPropagation();
        setScenarioToEdit(scenario);
        setNewScenarioName(scenario.name);
        setIsCreateModalOpen(true);
    };

    const handleDeleteClick = (e: React.MouseEvent, scenario: WebScenario) => {
        e.stopPropagation();
        setScenarioToDelete(scenario);
    };

    const confirmDelete = async () => {
        if (!scenarioToDelete) return;
        try {
            await deleteScenario(scenarioToDelete.id);
            setScenarioToDelete(null);
        } catch {
            console.error('Failed to delete scenario');
            const newToast: ToastMessage = {
                id: Date.now().toString(),
                type: 'error',
                title: 'Deletion Failed',
                message: 'Failed to delete scenario',
                duration: 5000
            };
            setToasts(prev => [...prev, newToast]);
        }
    };

    const handleCreateOrUpdateScenario = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (scenarioToEdit) {
                updateLocalScenario(scenarioToEdit.id, { name: newScenarioName });
                await saveScenario(scenarioToEdit.id);
            } else {
                if (!newScenarioName.trim() || (!projectId && !selectedProjectId)) return;
                const response = await api.post('/web-scenarios', {
                    name: newScenarioName,
                    projectId: projectId || selectedProjectId,
                    steps: [{ type: 'GOTO', value: 'https://www.google.com' }]
                });
                addScenario(response.data);
            }

            setNewScenarioName('');
            setIsCreateModalOpen(false);
            setScenarioToEdit(null);
        } catch {
            console.error('Failed to save scenario');
        }
    };

    const handleRunScenario = async () => {
        if (!selectedScenario) return;
        setExecuting(true);
        setExecutionState('RUNNING');
        setExecutionProgress(null);
        try {
            // Auto-save before execution to ensure backend has the latest steps
            await saveScenario(selectedScenario.id);

            const response = await api.post(`/web-scenarios/${selectedScenario.id}/execute${selectedEnvId ? `?environmentId=${selectedEnvId}` : ''}`);
            setLastExecution(response.data);
            fetchProjectHistory();
            setActiveTab('results');
        } catch {
            console.error('Execution failed');
        } finally {
            setExecuting(false);
            setExecutionProgress(null);
        }
    };



    const addStep = () => {
        if (!selectedScenario) return;
        const newSteps: Step[] = [...selectedScenario.steps, { type: 'CLICK', selector: '' }];
        updateLocalScenario(selectedScenario.id, { steps: newSteps });
    };

    const clearAllSteps = () => {
        setShowClearStepsModal(true);
    };

    const confirmClearAllSteps = () => {
        if (!selectedScenario) return;
        updateLocalScenario(selectedScenario.id, { steps: [] });
        setShowClearStepsModal(false);
    };

    const confirmClearHistory = async () => {
        await clearProjectHistory();
        setShowClearHistoryModal(false);
    };

    const updateStep = (index: number, field: keyof Step, value: string) => {
        if (!selectedScenario) return;
        const newSteps = [...selectedScenario.steps];
        newSteps[index] = { ...newSteps[index], [field]: value };
        updateLocalScenario(selectedScenario.id, { steps: newSteps });
    };

    const removeStep = (index: number) => {
        if (!selectedScenario) return;
        const newSteps = selectedScenario.steps.filter((_, i) => i !== index);
        updateLocalScenario(selectedScenario.id, { steps: newSteps });
    };

    const moveStep = (index: number, direction: 'up' | 'down') => {
        if (!selectedScenario) return;
        const newSteps = [...selectedScenario.steps];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newSteps.length) return;

        const [movedStep] = newSteps.splice(index, 1);
        newSteps.splice(targetIndex, 0, movedStep);

        updateLocalScenario(selectedScenario.id, { steps: newSteps });
    };

    const openScriptEditor = () => {
        if (!selectedScenario) return;
        setScriptContent(JSON.stringify(selectedScenario.steps, null, 2));
        setIsScriptModalOpen(true);
    };

    const applyScript = async () => {
        if (!selectedScenario) return;
        try {
            const parsed = JSON.parse(scriptContent);
            if (!Array.isArray(parsed)) throw new Error('Root must be an array');

            // Validate that every step has at least a type
            const invalidStepIndex = parsed.findIndex(s => !s || typeof s !== 'object' || !s.type);
            if (invalidStepIndex !== -1) {
                const newToast: ToastMessage = {
                    id: Date.now().toString(),
                    type: 'error',
                    title: 'Invalid Script',
                    message: `Invalid step at index ${invalidStepIndex}: Missing 'type' property.`,
                    duration: 5000
                };
                setToasts(prev => [...prev, newToast]);
                return;
            }

            const updatedScenario = { ...selectedScenario, steps: parsed };
            updateLocalScenario(updatedScenario.id, { steps: parsed });
            // Immediate save for script changes
            await saveScenario(updatedScenario.id);

            setIsScriptModalOpen(false);
        } catch (err) {
            console.error('Failed to parse script', err);
            const newToast: ToastMessage = {
                id: Date.now().toString(),
                type: 'error',
                title: 'Parse Error',
                message: 'Invalid JSON format: ' + (err as Error).message,
                duration: 5000
            };
            setToasts(prev => [...prev, newToast]);
        }
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="animate-spin text-accent mb-4" size={32} />
            <p className="text-[10px] font-mono text-secondary-text uppercase tracking-widest">Hydrating Core Modules...</p>
        </div>
    );

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] gap-4 overflow-hidden">
            {/* Unified Top Header */}
            <div className="flex items-center justify-between bg-surface/50 border-sharp border-main h-14 px-4 gap-4 shrink-0">
                {/* Left: Project and Scenario Selection */}
                <div className="flex items-center gap-4 flex-1 h-full">
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-secondary-text uppercase tracking-tighter">Project</span>
                        <select
                            value={selectedProjectId || projectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            className="bg-deep border border-main text-[10px] font-mono text-accent focus:outline-none px-3 py-1 min-w-[140px] hover:border-accent/50 transition-colors"
                        >
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {selectedScenario && (
                        <div className="flex items-center gap-3 flex-1 border-l border-main/50 pl-4 h-8">
                            <Globe className="text-secondary-text" size={12} />
                            <input
                                type="text"
                                value={selectedScenario.name}
                                onChange={(e) => updateLocalScenario(selectedScenario.id, { name: e.target.value })}
                                className="bg-transparent border-none text-[11px] font-mono font-bold text-primary-text focus:outline-none focus:ring-1 focus:ring-accent/20 px-2 flex-1 max-w-[240px] uppercase tracking-wide"
                            />
                        </div>
                    )}
                </div>

                {/* Right: Environment, Record, Run and Suite Run */}
                <div className="flex items-center gap-3 h-full">
                    {selectedScenario && (
                        <>
                            <div className="flex items-center gap-3 border-r border-main/50 pr-4 h-8">
                                <span className="text-[9px] font-mono text-secondary-text uppercase tracking-tighter">Env</span>
                                <select
                                    value={selectedEnvId}
                                    onChange={(e) => setSelectedEnvId(e.target.value)}
                                    className="bg-deep border border-main text-[10px] font-mono text-accent focus:outline-none px-3 py-0.5 hover:border-accent/50 transition-colors"
                                >
                                    <option value="">NO_ENVIRONMENT</option>
                                    {environments.map(env => (
                                        <option key={env.id} value={env.id}>{env.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-2 h-8">
                                {!isRecording ? (
                                    <Button
                                        onClick={() => setShowRecordModal(true)}
                                        className="h-full px-4 text-[9px] uppercase tracking-widest bg-rose-500/10 border border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-300"
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-2" />
                                        RECORD
                                    </Button>
                                ) : (
                                    <Button
                                        variant="danger"
                                        onClick={handleStopRecording}
                                        className="h-full px-4 text-[9px] uppercase tracking-widest animate-pulse"
                                    >
                                        <Target size={12} className="mr-2" />
                                        STOPREC
                                    </Button>
                                )}

                                {executing ? (
                                    <div className="flex gap-1 h-full">
                                        {executionState === 'PAUSED' ? (
                                            <Button
                                                variant="primary"
                                                onClick={handleResume}
                                                className="h-full px-4 text-[9px] uppercase tracking-widest font-bold bg-emerald-500/20 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500 hover:text-deep"
                                            >
                                                <Play size={12} className="mr-2" />
                                                RESUME
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="secondary"
                                                onClick={handlePause}
                                                className="h-full px-4 text-[9px] uppercase tracking-widest font-bold bg-amber-500/20 text-amber-500 border-amber-500/30 hover:bg-amber-500 hover:text-deep"
                                            >
                                                <Pause size={12} className="mr-2" />
                                                PAUSE
                                            </Button>
                                        )}
                                        <Button
                                            variant="danger"
                                            onClick={handleStop}
                                            className="h-full px-4 text-[9px] uppercase tracking-widest font-bold"
                                        >
                                            <StopCircle size={12} className="mr-2" />
                                            STOP
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <Button
                                            variant="primary"
                                            onClick={handleRunScenario}
                                            disabled={isRecording || syncStatus === 'saving'}
                                            className="h-full px-5 text-[9px] uppercase tracking-widest font-bold"
                                        >
                                            <Play size={12} className="mr-2" />
                                            RUN_TEST
                                        </Button>

                                        <Button
                                            onClick={handleRunAll}
                                            disabled={batchExecuting}
                                            className={`h-full px-5 text-[9px] uppercase tracking-widest font-bold border border-accent/30 bg-accent/5 text-accent hover:bg-accent hover:text-deep transition-all duration-300 ${batchExecuting ? 'animate-pulse' : ''}`}
                                        >
                                            {batchExecuting ? <Loader2 size={12} className="animate-spin mr-2" /> : <Layers size={12} className="mr-2" />}
                                            RUN_SUITE
                                        </Button>
                                    </>
                                )}
                            </div>

                            <div className="flex items-center border-l border-main/50 pl-4 h-8 min-w-[100px] justify-center text-center">
                                {syncStatus === 'saving' ? (
                                    <span className="text-[8px] font-mono text-amber-500 uppercase animate-pulse flex items-center gap-1">
                                        <Loader2 size={10} className="animate-spin" /> Saving
                                    </span>
                                ) : syncStatus === 'saved' ? (
                                    <span className="text-[8px] font-mono text-emerald-500 uppercase flex items-center gap-1">
                                        <CheckCircle2 size={10} /> Synced
                                    </span>
                                ) : syncStatus === 'error' ? (
                                    <span className="text-[8px] font-mono text-rose-500 uppercase flex items-center gap-1">
                                        <XCircle size={10} /> Sync_Err
                                    </span>
                                ) : (
                                    <span className="text-[8px] font-mono text-secondary-text/40 uppercase flex items-center gap-1">
                                        <CheckCircle2 size={10} className="opacity-20" /> Synced
                                    </span>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="flex flex-col lg:flex-row flex-1 gap-4 overflow-hidden">
                {/* Sidebar */}
                <div className={`
                    w-full lg:w-80 flex flex-col border-sharp border-main bg-surface/50 overflow-hidden shrink-0
                    ${selectedScenario ? 'h-48 lg:h-auto' : 'flex-1'}
                `}>
                    <div className="h-10 border-b border-main flex bg-deep/50 shrink-0 items-center justify-between px-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-accent flex items-center gap-2">
                            <Monitor size={14} /> SCENARIOS
                        </span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="text-secondary-text hover:text-white transition-all hover:scale-110 active:scale-95"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto custom-scrollbar p-2 space-y-1">
                        {scenarios.map(s => (
                            <div
                                key={s.id}
                                onClick={() => selectScenario(s)}
                                className={`w-full text-left p-2 border-sharp transition-all flex items-center gap-2 group cursor-pointer
                                    ${selectedScenario?.id === s.id ? 'bg-accent/10 border-accent/30 text-accent' : 'text-secondary-text hover:bg-surface hover:text-primary-text'}`}
                            >
                                <Globe size={14} />
                                <span className="text-[11px] font-mono truncate uppercase flex-1">{s.name}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handleEditClick(e, s)}
                                        className="p-1 hover:text-accent hover:bg-deep/50 rounded"
                                    >
                                        <Edit2 size={12} />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteClick(e, s)}
                                        className="p-1 hover:text-rose-500 hover:bg-deep/50 rounded"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Scenario Editor */}
                {selectedScenario ? (
                    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-5 gap-4 min-h-0 overflow-y-auto lg:overflow-hidden">
                            {/* Steps Builder */}
                            <div className="lg:col-span-3 flex flex-col border-sharp border-main bg-surface/30 overflow-hidden min-h-[400px]">
                                <div className="h-10 border-b border-main bg-deep/50 flex items-center justify-between px-4 shrink-0">
                                    <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-widest">WORKFLOW_STEPS</span>
                                    <div className="flex items-center gap-1">
                                        <div className="flex bg-deep/50 rounded p-0.5 border border-main mr-2">
                                            <button
                                                onClick={() => setViewMode('code')}
                                                className={`px-2 py-0.5 text-[8px] uppercase tracking-widest rounded transition-colors ${viewMode === 'code' ? 'bg-accent text-deep font-bold' : 'text-secondary-text hover:text-white'}`}
                                            >
                                                List
                                            </button>
                                            <button
                                                onClick={() => setViewMode('visual')}
                                                className={`px-2 py-0.5 text-[8px] uppercase tracking-widest rounded transition-colors ${viewMode === 'visual' ? 'bg-accent text-deep font-bold' : 'text-secondary-text hover:text-white'}`}
                                            >
                                                Visual
                                            </button>
                                        </div>
                                        <Button onClick={openScriptEditor} variant="ghost" className="h-6 text-[8px] uppercase tracking-widest text-secondary-text hover:text-accent">
                                            <Code2 size={10} className="mr-1" /> JSON
                                        </Button>
                                        <Button onClick={clearAllSteps} variant="ghost" className="h-6 text-[8px] uppercase tracking-widest text-rose-500/60 hover:text-rose-500">
                                            <Trash2 size={10} className="mr-1" /> CLEAR_ALL
                                        </Button>
                                        <Button onClick={addStep} variant="ghost" className="h-6 text-[8px] uppercase tracking-widest">
                                            <Plus size={10} className="mr-1" /> ADD_STEP
                                        </Button>
                                    </div>
                                </div>
                                {viewMode === 'visual' ? (
                                    <div className="flex-1 bg-deep/20">
                                        <VisualBuilder
                                            initialSteps={selectedScenario.steps}
                                            onStepsChange={(steps) => updateLocalScenario(selectedScenario.id, { steps })}
                                        />
                                    </div>
                                ) : (
                                    <div className="flex-1 overflow-auto p-4 space-y-3 custom-scrollbar">
                                        {selectedScenario.steps.map((step, idx) => (
                                            <div key={idx} className="flex gap-3 items-start group">
                                                <div className="w-6 h-6 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-[10px] font-mono text-accent shrink-0 mt-1">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 bg-deep/50 border border-main p-3 space-y-3 relative">
                                                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => moveStep(idx, 'up')} disabled={idx === 0} className="p-1 text-secondary-text hover:text-accent disabled:opacity-30 disabled:hover:text-secondary-text"><ChevronUp size={14} /></button>
                                                        <button onClick={() => moveStep(idx, 'down')} disabled={idx === selectedScenario.steps.length - 1} className="p-1 text-secondary-text hover:text-accent disabled:opacity-30 disabled:hover:text-secondary-text"><ChevronDown size={14} /></button>
                                                        <button onClick={() => removeStep(idx)} className="p-1 text-secondary-text hover:text-danger ml-1"><X size={14} /></button>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                {(step.type === 'GOTO') && <ExternalLink size={10} className="text-emerald-500" />}
                                                                {['CLICK', 'DOUBLE_CLICK', 'RIGHT_CLICK'].includes(step.type) && <MousePointer2 size={10} className="text-accent" />}
                                                                {['FILL', 'TYPE', 'KEY_PRESS'].includes(step.type) && <TextCursorInput size={10} className="text-accent" />}
                                                                {(step.type === 'HOVER') && <Target size={10} className="text-accent" />}
                                                                {(step.type === 'SELECT') && <ChevronDown size={10} className="text-accent" />}
                                                                {(step.type === 'CHECK') && <CheckSquare size={10} className="text-emerald-500" />}
                                                                {(step.type === 'UNCHECK') && <Square size={10} className="text-secondary-text" />}
                                                                {(step.type === 'SUBMIT') && <Anchor size={10} className="text-amber-500" />}
                                                                {(step.type === 'RELOAD') && <RefreshCw size={10} className="text-blue-500" />}
                                                                {(step.type === 'WAIT') && <Clock size={10} className="text-amber-400" />}
                                                                {(step.type === 'SCROLL') && <MoveDown size={10} className="text-purple-400" />}
                                                                {(step.type === 'COMMENT') && <MessageSquare size={10} className="text-cyan-400" />}
                                                                {step.type?.startsWith('ASSERT') && !step.type?.includes('HIDDEN') && <CheckCircle2 size={10} className="text-emerald-500" />}
                                                                {step.type === 'ASSERT_HIDDEN' && <EyeOff size={10} className="text-rose-400" />}
                                                                <label className="text-[8px] font-mono text-secondary-text uppercase block">ACTION_TYPE</label>
                                                            </div>
                                                            <select value={step.type} onChange={(e) => updateStep(idx, 'type', e.target.value)} className="w-full bg-surface border-sharp border-main px-2 py-1 text-[10px] font-mono text-accent focus:outline-none">
                                                                <optgroup label="NAVIGATION" className="bg-deep text-[10px]">
                                                                    <option value="GOTO">GOTO_URL</option>
                                                                    <option value="RELOAD">RELOAD_PAGE</option>
                                                                </optgroup>
                                                                <optgroup label="INTERACTION" className="bg-deep text-[10px]">
                                                                    <option value="CLICK">MOUSE_CLICK</option>
                                                                    <option value="DOUBLE_CLICK">DOUBLE_CLICK</option>
                                                                    <option value="RIGHT_CLICK">RIGHT_CLICK</option>
                                                                    <option value="HOVER">HOVER_OVER</option>
                                                                    <option value="SCROLL">SCROLL_TO</option>
                                                                </optgroup>
                                                                <optgroup label="FORM_DATA" className="bg-deep text-[10px]">
                                                                    <option value="FILL">SET_VALUE</option>
                                                                    <option value="TYPE">TYPE_KEYS</option>
                                                                    <option value="KEY_PRESS">SINGLE_KEY</option>
                                                                    <option value="SELECT">SELECT_OPTION</option>
                                                                    <option value="CHECK">CHECK_BOX</option>
                                                                    <option value="UNCHECK">UNCHECK_BOX</option>
                                                                    <option value="SUBMIT">SUBMIT_FORM</option>
                                                                    <option value="HOVER">MOUSE_HOVER</option>
                                                                    <option value="DRAG_AND_DROP">DRAG_AND_DROP</option>
                                                                    <option value="SWITCH_FRAME">SWITCH_FRAME</option>
                                                                </optgroup>
                                                                <optgroup label="VALIDATION" className="bg-deep text-[10px]">
                                                                    <option value="ASSERT_VISIBLE">ASSERT_VISIBLE</option>
                                                                    <option value="ASSERT_HIDDEN">ASSERT_HIDDEN</option>
                                                                    <option value="ASSERT_TEXT">ASSERT_CONTENT</option>
                                                                    <option value="ASSERT_VALUE">ASSERT_INPUT_VALUE</option>
                                                                    <option value="ASSERT_URL">ASSERT_URL</option>
                                                                    <option value="ASSERT_TITLE">ASSERT_TITLE</option>
                                                                </optgroup>
                                                                <optgroup label="CONTROL" className="bg-deep text-[10px]">
                                                                    <option value="WAIT">WAIT_TIME</option>
                                                                </optgroup>
                                                                <optgroup label="ORGANIZATION" className="bg-deep text-[10px]">
                                                                    <option value="COMMENT">COMMENT_SEPARATOR</option>
                                                                </optgroup>
                                                            </select>
                                                        </div>
                                                        {['CLICK', 'DOUBLE_CLICK', 'RIGHT_CLICK', 'FILL', 'TYPE', 'HOVER', 'SELECT', 'CHECK', 'UNCHECK', 'SUBMIT', 'ASSERT_VISIBLE', 'ASSERT_HIDDEN', 'ASSERT_TEXT', 'ASSERT_VALUE', 'SCROLL', 'DRAG_AND_DROP', 'SWITCH_FRAME'].includes(step.type) && (
                                                            <div>
                                                                <label className="text-[8px] font-mono text-secondary-text uppercase mb-1 block">UI_SELECTOR</label>
                                                                <input
                                                                    onChange={(e) => updateStep(idx, 'selector', e.target.value)}
                                                                    value={step.selector || ''}
                                                                    className="w-full bg-surface border-sharp border-main px-2 py-1 text-[10px] font-mono text-primary-text focus:outline-none placeholder:opacity-20"
                                                                    placeholder="#id, .class, [data-testid]..."
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex gap-2 items-end">
                                                        <div className="flex-1">
                                                            <label className="text-[8px] font-mono text-secondary-text uppercase mb-1 block">VALUE_STRING</label>
                                                            <input
                                                                value={step.value || ''}
                                                                onChange={(e) => updateStep(idx, 'value', e.target.value)}
                                                                className="w-full bg-surface border-sharp border-main px-2 py-1 text-[10px] font-mono text-primary-text focus:outline-none"
                                                                placeholder={
                                                                    step.type === 'GOTO' ? 'https://...' :
                                                                        step.type === 'WAIT' ? 'Milliseconds (e.g. 2000)' :
                                                                            step.type === 'KEY_PRESS' ? 'Key Name (e.g. Escape, Enter, Tab)' :
                                                                                step.type === 'SELECT' ? 'Value or label of the option' :
                                                                                    step.type === 'DRAG_AND_DROP' ? 'Target UI Selector' :
                                                                                        step.type === 'SWITCH_FRAME' ? 'Frame Name, ID or Selector' :
                                                                                            (step.type?.includes('ASSERT_URL') ? 'Substring of URL' : 'Data or expected text')
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Execution Activity */}
                            <div className="lg:col-span-2 flex flex-col border-sharp border-main bg-surface/30 overflow-hidden relative min-h-[300px]">
                                {executing && ( // Changed executing to isPlaying
                                    <div className="absolute inset-0 bg-deep/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                                        <Loader2 className="animate-spin text-accent mb-4" size={48} />
                                        <h2 className="text-sm font-mono font-bold text-accent uppercase tracking-[0.2em] mb-2">SPOOLING_BROWSER</h2>
                                        {executionProgress ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="text-[12px] font-mono text-primary-text uppercase tracking-widest font-bold">
                                                    Step {executionProgress.current} of {executionProgress.total}
                                                </span>
                                                <span className="text-[10px] font-mono text-accent bg-accent/10 px-3 py-1 border border-accent/30 rounded uppercase">
                                                    Executing: {executionProgress.type}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] font-mono text-secondary-text animate-pulse uppercase">Remote_Execution_Layer_Active</span>
                                        )}
                                    </div>
                                )}

                                <Tabs
                                    tabs={[
                                        { id: 'results', label: 'LIVE_LOGS' },
                                        { id: 'activity', label: 'ACTIVITY' },
                                        { id: 'insights', label: 'INSIGHTS' },
                                        { id: 'brain', label: 'BRAIN_CORE' }
                                    ]}
                                    activeTab={activeTab}
                                    onTabChange={(id) => setActiveTab(id as 'results' | 'activity' | 'insights' | 'brain')}
                                />

                                <div className="flex-1 overflow-hidden bg-deep custom-scrollbar">
                                    {activeTab === 'results' ? (
                                        <div className="p-4 h-full overflow-auto custom-scrollbar">
                                            {lastExecution ? (
                                                <div className="space-y-4">
                                                    <div className={`p-3 border-sharp border flex items-center justify-between
                                                            ${lastExecution.status === 'SUCCESS' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-rose-500/10 border-rose-500/30 text-rose-500'}`}>
                                                        <div className="flex items-center gap-2">
                                                            {lastExecution.status === 'SUCCESS' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                                            <span className="text-xs font-mono font-bold uppercase tracking-wider">STATUS_{lastExecution.status}</span>
                                                        </div>
                                                        <span className="text-[10px] font-mono opacity-70">{lastExecution.duration}ms</span>
                                                    </div>

                                                    {lastExecution.screenshot && (
                                                        <div className="border border-main p-1 bg-surface">
                                                            <p className="text-[8px] font-mono text-secondary-text uppercase mb-1 flex items-center gap-1">
                                                                <ImageIcon size={10} /> {lastExecution.status === 'SUCCESS' ? 'FINAL_STATE_SUCCESS' : 'FAILURE_STATE_ERROR'}
                                                            </p>
                                                            <img src={lastExecution.screenshot} alt="Visual Proof" className="w-full grayscale hover:grayscale-0 transition-all cursor-zoom-in" />
                                                        </div>
                                                    )}

                                                    <div className="space-y-1.5 pt-2">
                                                        <p className="text-[9px] font-mono text-accent uppercase tracking-widest mb-2 flex items-center gap-2">
                                                            <Activity size={12} /> EXECUTION_TIMELINE
                                                        </p>
                                                        {lastExecution.logs?.map((log, li) => (
                                                            <div key={li} className="flex gap-3 text-[10px] font-mono border-l-2 border-main pl-3 pb-2 last:pb-0">
                                                                <span className="text-[8px] opacity-40 whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                                                <div className="flex-1">
                                                                    <div className="flex justify-between items-start">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={log.error ? 'text-rose-500' : 'text-primary-text'}>{log.step || 'SYSTEM'}</span>
                                                                            {log.status === 'HEALED' && (
                                                                                <span className="flex items-center gap-1 bg-amber-500/20 text-amber-500 text-[8px] px-1 rounded animate-pulse">
                                                                                    <Sparkles size={8} /> SELF_HEALED
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {log.duration && <span className="text-[8px] text-secondary-text opacity-50">{log.duration}ms</span>}
                                                                    </div>
                                                                    {log.info && <p className="text-[9px] text-secondary-text mt-0.5">{log.info}</p>}
                                                                    {log.error && <p className="text-[9px] text-rose-500/80 mt-0.5 font-bold">ERROR: {log.error}</p>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                                                    <Monitor size={32} className="mb-4" />
                                                    <p className="text-[10px] font-mono uppercase tracking-[0.2em]">Ready_to_Initialize<br />[ Run Scenario ]</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : activeTab === 'activity' ? (
                                        <div className="flex flex-col h-full overflow-hidden">
                                            <div className="h-8 border-b border-main flex items-center justify-between px-2 shrink-0 bg-deep/30">
                                                <span className="text-[9px] font-mono text-secondary-text uppercase tracking-widest">Global Activity History</span>
                                                <button
                                                    onClick={() => setShowClearHistoryModal(true)}
                                                    className="text-[9px] font-mono text-rose-500 hover:text-rose-400 transition-colors uppercase tracking-widest flex items-center gap-1"
                                                >
                                                    <Trash2 size={10} /> CLEAR_ALL
                                                </button>
                                            </div>

                                            <div className="flex-1 overflow-auto custom-scrollbar p-2 space-y-2 bg-deep/10">
                                                {/* Show Running Scenarios First */}
                                                {scenarios.filter(s => runningScenarios.has(s.id)).map(s => (
                                                    <div key={`running-${s.id}`} className="border-sharp border-accent/50 bg-accent/5 p-2 space-y-1 animate-pulse">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] font-mono font-bold text-accent truncate max-w-[150px]">{s.name}</span>
                                                            <span className="text-[8px] font-mono font-bold px-1 rounded-sm bg-accent/20 text-accent flex items-center gap-1">
                                                                <Loader2 size={8} className="animate-spin" /> RUNNING
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}

                                                {projectHistory.map((ex: ExecutionResult, idx: number) => (
                                                    <div
                                                        key={idx}
                                                        onClick={() => { setLastExecution(ex); setActiveTab('results'); }}
                                                        className={`border-sharp border-main bg-surface/30 p-2 space-y-1 hover:border-accent/30 transition-all cursor-pointer ${lastExecution?.id === ex.id ? 'border-accent bg-accent/5' : ''}`}
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] font-mono font-bold text-accent truncate max-w-[150px]">{ex.scenario?.name}</span>
                                                            <span className={`text-[8px] font-mono font-bold px-1 rounded-sm ${ex.status === 'SUCCESS' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                                {ex.status}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[8px] font-mono text-secondary-text">
                                                            <span>{new Date(ex.createdAt).toLocaleTimeString()}</span>
                                                            <span>{ex.duration}ms</span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {projectHistory.length === 0 && runningScenarios.size === 0 && (
                                                    <div className="h-full flex flex-col items-center justify-center opacity-30 mt-20">
                                                        <Activity size={32} className="mb-2" />
                                                        <span className="text-[10px] font-mono">NO_ACTIVITY_YET</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col p-4 space-y-4 animate-in fade-in zoom-in-95 duration-300 overflow-y-auto custom-scrollbar">
                                            {/* Legacy Insights removed, restored below */}

                                            {/* Execution Heatmap Section (Original Insights) */}
                                            {activeTab === 'insights' && scenarioHistory.length > 0 && (
                                                <div className="flex-1 flex flex-col overflow-hidden bg-deep/20">
                                                    <div className="px-4 py-2 border-b border-main bg-main/5 flex items-center justify-between">
                                                        <span className="text-[9px] font-mono text-secondary-text uppercase tracking-widest">Execution Analytics</span>
                                                        <Activity size={10} className="text-secondary-text" />
                                                    </div>
                                                    <div className="flex-1 p-4">
                                                        <ScenarioHeatmap
                                                            history={scenarioHistory}
                                                            steps={selectedScenario.steps}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Cartographer Section (from original brain) */}
                                            {activeTab === 'brain' && (
                                                <div className="bg-surface/50 border border-main p-4 space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-accent/20 rounded">
                                                            <BrainCircuit size={18} className="text-accent" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-[12px] font-mono font-bold text-primary-text uppercase tracking-widest">The Cartographer</h3>
                                                            <p className="text-[9px] font-mono text-secondary-text uppercase">Global Topology Mapping</p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[8px] font-mono text-secondary-text uppercase block">Root_Mapping_URL</label>
                                                            <div className="flex gap-2">
                                                                <input
                                                                    value={mappingUrl}
                                                                    onChange={(e) => setMappingUrl(e.target.value)}
                                                                    placeholder="https://example.com"
                                                                    className="flex-1 bg-deep border border-main px-3 py-1.5 text-[10px] font-mono text-primary-text focus:outline-none focus:border-accent/40"
                                                                />
                                                                <Button
                                                                    onClick={startSemanticMapping}
                                                                    disabled={isMappingBrain || !mappingUrl}
                                                                    className="h-8 text-[9px] font-bold uppercase tracking-widest"
                                                                >
                                                                    {isMappingBrain ? <Loader2 className="animate-spin" size={12} /> : <Zap size={12} className="mr-2" />}
                                                                    {isMappingBrain ? 'MAPPING...' : 'START_MAP'}
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        {mappingStatus && (
                                                            <div className="flex items-center gap-3 p-3 bg-deep border border-sharp border-main animate-in slide-in-from-top-2 duration-300">
                                                                <div className={`p-1.5 rounded-full ${mappingStatus.status === 'MAPPING_SUCCESS' ? 'bg-emerald-500/20 text-emerald-500' :
                                                                    mappingStatus.status === 'MAPPING_FAILED' ? 'bg-rose-500/20 text-rose-500' :
                                                                        'bg-accent/20 text-accent animate-pulse'
                                                                    }`}>
                                                                    {mappingStatus.status === 'MAPPING_SUCCESS' ? <CheckCircle2 size={12} /> :
                                                                        mappingStatus.status === 'MAPPING_FAILED' ? <XCircle size={12} /> :
                                                                            <Loader2 size={12} className="animate-spin" />
                                                                    }
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-[10px] font-mono font-bold text-primary-text uppercase tracking-wider">
                                                                        {mappingStatus.status.replace(/_/g, ' ')}
                                                                    </p>
                                                                    <p className="text-[8px] font-mono text-secondary-text uppercase">
                                                                        {mappingStatus.status === 'MAPPING_IN_PROGRESS' && `Pages_Mapped: ${mappingStatus.pagesMapped}`}
                                                                        {mappingStatus.status === 'MAPPING_SUCCESS' && `Final_Topology_Size: ${mappingStatus.pagesMapped} Pages`}
                                                                        {mappingStatus.status === 'MAPPING_FAILED' && `Error: ${mappingStatus.error}`}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Oracle Section */}
                                            {activeTab === 'brain' && (
                                                <div className="bg-surface/50 border border-main p-4 space-y-4 flex-1 flex flex-col">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-amber-500/20 rounded">
                                                                <Sparkles size={18} className="text-amber-500" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-[12px] font-mono font-bold text-primary-text uppercase tracking-widest">The Oracle</h3>
                                                                <p className="text-[9px] font-mono text-secondary-text uppercase">Autogenerated Test Lab</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                onClick={generateOracleScript}
                                                                className="h-7 text-[8px] border border-amber-500/30 text-amber-500 hover:bg-amber-500/10 uppercase tracking-widest"
                                                            >
                                                                GENERATE_PLAYWRIGHT
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                onClick={generateOracleJSON}
                                                                disabled={!selectedScenario}
                                                                className="h-7 text-[8px] border border-accent/30 text-accent hover:bg-accent/10 uppercase tracking-widest"
                                                            >
                                                                GENERATE_JSON_STEPS
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {brainScript ? (
                                                        <div className="flex-1 bg-deep border border-main p-3 rounded font-mono text-[10px] text-accent/80 overflow-auto custom-scrollbar relative">
                                                            <div className="absolute top-2 right-2 flex gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(brainScript);
                                                                        const newToast: ToastMessage = {
                                                                            id: Date.now().toString(),
                                                                            type: 'success',
                                                                            title: 'Copied',
                                                                            message: 'Oracle script copied to clipboard',
                                                                            duration: 3000
                                                                        };
                                                                        setToasts(prev => [...prev, newToast]);
                                                                    }}
                                                                    className="p-1.5 hover:bg-white/5 rounded text-secondary-text hover:text-white transition-colors"
                                                                    title="Copy to Clipboard"
                                                                >
                                                                    <Code2 size={12} />
                                                                </button>
                                                            </div>
                                                            <pre className="whitespace-pre-wrap">{brainScript}</pre>
                                                        </div>
                                                    ) : (
                                                        <div className="flex-1 flex flex-col items-center justify-center opacity-30 gap-2 border border-dashed border-main rounded">
                                                            <Code2 size={24} />
                                                            <span className="text-[9px] font-mono uppercase tracking-widest">No scripts generated yet</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-20">
                        <Monitor size={64} className="mb-6" />
                        <p className="text-sm font-mono uppercase tracking-[0.4em]">Initialize_Web_Scenario</p>
                    </div>
                )}

                <Modal
                    isOpen={isCreateModalOpen}
                    onClose={() => { setIsCreateModalOpen(false); setScenarioToEdit(null); setNewScenarioName(''); }}
                    title={scenarioToEdit ? "EDIT_SCENARIO" : "REGISTER_NEW_WORKFLOW"}
                >
                    <form onSubmit={handleCreateOrUpdateScenario} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-mono text-secondary-text uppercase tracking-widest block">SCENARIO_IDENTIFIER</label>
                            <input
                                autoFocus
                                value={newScenarioName}
                                onChange={(e) => setNewScenarioName(e.target.value)}
                                className="w-full bg-deep border-sharp border-main px-4 py-3 text-sm font-mono text-primary-text focus:border-accent/50 focus:outline-none"
                                placeholder="e.g. AUTH_FLOW_SUCCESS"
                            />
                        </div>
                        {!projectId && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-mono text-secondary-text uppercase tracking-widest block">TARGET_PROJECT</label>
                                <select
                                    value={selectedProjectId}
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                    className="w-full bg-deep border-sharp border-main px-4 py-3 text-sm font-mono text-accent focus:border-accent/50 focus:outline-none"
                                >
                                    <option value="" disabled>SELECT_A_PROJECT</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="flex gap-3 pt-4">
                            <Button variant="ghost" onClick={() => { setIsCreateModalOpen(false); setScenarioToEdit(null); }} className="flex-1">CANCEL</Button>
                            <Button type="submit" glow className="flex-1">{scenarioToEdit ? 'UPDATE_SCENARIO' : 'CREATE_SCENARIO'}</Button>
                        </div>
                    </form>
                </Modal>

                <Modal
                    isOpen={isScriptModalOpen}
                    onClose={() => setIsScriptModalOpen(false)}
                    title="JSON_SCRIPT_EDITOR"
                >
                    <div className="space-y-4">
                        <p className="text-[10px] font-mono text-secondary-text uppercase">
                            Edit the raw JSON array of steps below. Be careful with the syntax.
                        </p>
                        <textarea
                            value={scriptContent}
                            onChange={(e) => setScriptContent(e.target.value)}
                            className="w-full h-80 bg-deep border border-main p-4 text-[11px] font-mono text-accent focus:outline-none custom-scrollbar resize-none"
                            spellCheck={false}
                        />
                        <div className="flex justify-end gap-3">
                            <Button variant="ghost" onClick={() => setIsScriptModalOpen(false)} className="text-[10px] uppercase">
                                Cancel
                            </Button>
                            <Button onClick={applyScript} className="text-[10px] uppercase">
                                Apply Changes
                            </Button>
                        </div>
                    </div>
                </Modal>

                <ConfirmModal
                    isOpen={!!scenarioToDelete}
                    onClose={() => setScenarioToDelete(null)}
                    onConfirm={confirmDelete}
                    title="CONFIRM_DELETION"
                    message={`Are you sure you want to delete ${scenarioToDelete?.name}? This action cannot be undone and all execution history will be lost.`}
                    confirmText="CONFIRM_DELETE"
                />

                <ConfirmModal
                    isOpen={showClearStepsModal}
                    onClose={() => setShowClearStepsModal(false)}
                    onConfirm={confirmClearAllSteps}
                    title="CONFIRM_CLEAR_STEPS"
                    message="Are you sure you want to delete ALL STEPS from this scenario? This action cannot be undone."
                    confirmText="CLEAR_ALL_STEPS"
                />

                <ConfirmModal
                    isOpen={showClearHistoryModal}
                    onClose={() => setShowClearHistoryModal(false)}
                    onConfirm={confirmClearHistory}
                    title="CONFIRM_CLEAR_HISTORY"
                    message="Are you sure you want to delete ALL PROJECT HISTORY? This will wipe the execution logs for all scenarios in this project."
                    confirmText="CLEAR_HISTORY"
                />

                {/* Recording Modal */}
                {
                    showRecordModal && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
                            <Card className="w-[400px] border-primary/20 bg-[#0B0C0E]">
                                <div className="p-4 border-b border-white/5 flex justify-between items-center">
                                    <h3 className="text-sm font-medium flex items-center gap-2">
                                        <Sparkles size={16} className="text-primary" />
                                        Smart Recorder
                                    </h3>
                                    <button onClick={() => setShowRecordModal(false)} className="text-secondary-text hover:text-white transition-colors">
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <p className="text-xs text-secondary-text leading-relaxed">
                                        Enter the starting URL. A browser will open locally to record your interactions.
                                        <br />
                                        <span className="text-amber-500/80 font-medium">Note: The browser will open on the host machine.</span>
                                    </p>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={recordingUrl}
                                        onChange={(e) => setRecordingUrl(e.target.value)}
                                        placeholder="https://example.com"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                                    />
                                    <Button
                                        className="w-full h-10"
                                        onClick={handleStartRecording}
                                        disabled={!recordingUrl}
                                    >
                                        <Play size={14} className="mr-2" />
                                        START_RECORDING
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    )
                }
                <ToastContainer toasts={toasts} removeToast={removeToast} />
            </div>
        </div>
    );
};

export default WebScenarios;
