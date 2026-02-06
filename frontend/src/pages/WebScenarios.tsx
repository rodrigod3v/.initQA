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
    Sparkles
} from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { Tabs } from '@/shared/ui/Tabs';

import { useProjectStore } from '@/stores/projectStore';
import { useScenarioStore, type WebScenario, type Step } from '@/stores/scenarioStore';
import { useProjectMetadata } from '@/features/webScenario/hooks/useProjectMetadata';
import { useWebScenarioHistory } from '@/features/webScenario/hooks/useWebScenarioHistory';
import { useWebScenarioExecution } from '@/features/webScenario/hooks/useWebScenarioExecution';

const WebScenarios: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();

    // Store Hooks
    const selectProject = useProjectStore(state => state.selectProject);

    // Store State - Optimized Subscriptions
    const scenarios = useScenarioStore(state => state.scenarios);
    const selectedScenario = useScenarioStore(state => state.selectedScenario);
    const isLoading = useScenarioStore(state => state.isLoading);

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
        setSelectedProjectId
    } = useProjectMetadata(projectId);

    const effectiveProjectId = projectId || selectedProjectId;

    const {
        projectHistory,
        fetchProjectHistory
    } = useWebScenarioHistory(effectiveProjectId, selectedScenario?.id);

    const {
        batchExecuting,
        runningScenarios,
        handleRunAll: runAll,
    } = useWebScenarioExecution(selectedEnvId, fetchProjectHistory);

    // Local State
    const [executing, setExecuting] = useState(false);
    const [lastExecution, setLastExecution] = useState<any>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingUrl, setRecordingUrl] = useState('');
    const [showRecordModal, setShowRecordModal] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newScenarioName, setNewScenarioName] = useState('');
    const [scenarioToEdit, setScenarioToEdit] = useState<WebScenario | null>(null);
    const [scenarioToDelete, setScenarioToDelete] = useState<WebScenario | null>(null);
    const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
    const [scriptContent, setScriptContent] = useState('');
    const [activeTab, setActiveTab] = useState<'results' | 'activity'>('results');

    useEffect(() => {
        if (effectiveProjectId) {
            fetchScenarios(effectiveProjectId);

            // Sync selected project in store for Sidebar context
            const syncProject = async () => {
                try {
                    const resp = await api.get(`/projects/${effectiveProjectId}`);
                    selectProject(resp.data);
                } catch (err) {
                    console.error('Failed to sync project store');
                }
            };
            syncProject();
        }
    }, [effectiveProjectId, selectProject]);

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
        } catch (err) {
            console.error('Failed to start recording', err);
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
                const newSteps = [...(selectedScenario?.steps || []), ...recordedSteps.map((s: any) => ({ // Changed currentScenario to selectedScenario
                    type: s.type,
                    selector: s.selector,
                    value: s.value
                }))];

                await updateLocalScenario(selectedScenario!.id, { steps: newSteps }); // Changed currentScenario to selectedScenario
            }
        } catch (err) {
            console.error('Failed to stop recording', err);
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
        } catch (err) {
            console.error('Failed to delete scenario');
            alert('Failed to delete scenario');
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
        } catch (err) {
            console.error('Failed to save scenario');
        }
    };

    const handleRunScenario = async () => {
        if (!selectedScenario) return;
        setExecuting(true);
        try {
            // Auto-save before execution to ensure backend has the latest steps
            await saveScenario(selectedScenario.id);

            const response = await api.post(`/web-scenarios/${selectedScenario.id}/execute${selectedEnvId ? `?environmentId=${selectedEnvId}` : ''}`);
            setLastExecution(response.data);
            fetchProjectHistory();
            setActiveTab('results');
        } catch (err) {
            console.error('Execution failed');
        } finally {
            setExecuting(false);
        }
    };

    const addStep = () => {
        if (!selectedScenario) return;
        const newSteps = [...selectedScenario.steps, { type: 'CLICK', selector: '' }];
        updateLocalScenario(selectedScenario.id, { steps: newSteps as any });
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
                alert(`Invalid step at index ${invalidStepIndex}: Missing 'type' property.`);
                return;
            }

            const updatedScenario = { ...selectedScenario, steps: parsed };
            updateLocalScenario(updatedScenario.id, { steps: parsed });
            // Immediate save for script changes
            await saveScenario(updatedScenario.id);

            setIsScriptModalOpen(false);
        } catch (err) {
            console.error('Failed to parse script', err);
            alert('Invalid JSON format: ' + (err as Error).message);
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
            {/* Project Selector Header */}
            <div className="flex items-center justify-between bg-surface/30 border-sharp border-main p-2">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-secondary-text uppercase">Project:</span>
                    <select
                        value={selectedProjectId || projectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="bg-deep border border-main text-[10px] font-mono text-accent focus:outline-none px-2 py-1 min-w-[150px]"
                    >
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                <Button
                    onClick={handleRunAll}
                    disabled={batchExecuting}
                    variant="ghost"
                    className={`h-8 text-[10px] uppercase tracking-widest ${batchExecuting ? 'text-accent animate-pulse' : 'text-accent'}`}
                >
                    {batchExecuting ? <Loader2 size={12} className="animate-spin mr-2" /> : <Play size={12} className="mr-2" />}
                    Run Project Suite
                </Button>
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
                        <Card className="p-2 border-main bg-surface/30">
                            <div className="flex justify-between items-center h-10 gap-2">
                                <div className="flex items-center gap-2 flex-1">
                                    <Globe className="text-accent" size={18} />
                                    <input
                                        type="text"
                                        value={selectedScenario.name}
                                        onChange={(e) => updateLocalScenario(selectedScenario.id, { name: e.target.value })}
                                        className="bg-transparent border-none text-xs font-mono font-bold text-primary-text focus:outline-none focus:ring-1 focus:ring-accent/30 px-2 flex-1"
                                    />
                                </div>
                                <div className="flex gap-2 h-full items-center">
                                    <div className="flex items-center gap-2 mr-2">
                                        <span className="text-[8px] font-mono text-secondary-text uppercase">ENV:</span>
                                        <select
                                            value={selectedEnvId}
                                            onChange={(e) => setSelectedEnvId(e.target.value)}
                                            className="bg-deep border border-main text-[10px] font-mono text-accent focus:outline-none px-2 py-1"
                                        >
                                            <option value="">NO_ENVIRONMENT</option>
                                            {environments.map(env => (
                                                <option key={env.id} value={env.id}>{env.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        {!isRecording ? (
                                            <Button
                                                variant="secondary"
                                                onClick={() => setShowRecordModal(true)}
                                                className="px-4 text-[10px] uppercase tracking-widest h-full"
                                            >
                                                <Sparkles size={14} className="mr-2" />
                                                SMART_RECORD
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="danger"
                                                onClick={handleStopRecording}
                                                className="px-4 text-[10px] uppercase tracking-widest h-full"
                                            >
                                                <Target size={14} className="animate-pulse mr-2" />
                                                STOP_RECORDING
                                            </Button>
                                        )}
                                        <Button
                                            variant="primary"
                                            onClick={handleRunScenario}
                                            disabled={executing || isRecording}
                                            glow
                                            className="px-6 text-[10px] uppercase tracking-widest h-full"
                                        >
                                            {executing ? <Loader2 className="animate-spin mr-2" size={14} /> : <Play size={14} className="mr-2" />}
                                            {executing ? 'RUNNING...' : 'RUN_TEST'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-5 gap-4 min-h-0 overflow-y-auto lg:overflow-hidden">
                            {/* Steps Builder */}
                            <div className="lg:col-span-3 flex flex-col border-sharp border-main bg-surface/30 overflow-hidden min-h-[400px]">
                                <div className="h-10 border-b border-main bg-deep/50 flex items-center justify-between px-4 shrink-0">
                                    <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-widest">WORKFLOW_STEPS</span>
                                    <div className="flex items-center gap-1">
                                        <Button onClick={openScriptEditor} variant="ghost" className="h-6 text-[8px] uppercase tracking-widest text-secondary-text hover:text-accent">
                                            <Code2 size={10} className="mr-1" /> SCRIPT_MODE
                                        </Button>
                                        <Button onClick={addStep} variant="ghost" className="h-6 text-[8px] uppercase tracking-widest">
                                            <Plus size={10} className="mr-1" /> ADD_STEP
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-auto p-4 space-y-3 custom-scrollbar">
                                    {selectedScenario.steps.map((step, idx) => (
                                        <div key={idx} className="flex gap-3 items-start group">
                                            <div className="w-6 h-6 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-[10px] font-mono text-accent shrink-0 mt-1">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 bg-deep/50 border border-main p-3 space-y-3 relative">
                                                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => moveStep(idx, 'up')}
                                                        disabled={idx === 0}
                                                        className="p-1 text-secondary-text hover:text-accent disabled:opacity-30 disabled:hover:text-secondary-text"
                                                        title="Move Up"
                                                    >
                                                        <ChevronUp size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => moveStep(idx, 'down')}
                                                        disabled={idx === selectedScenario.steps.length - 1}
                                                        className="p-1 text-secondary-text hover:text-accent disabled:opacity-30 disabled:hover:text-secondary-text"
                                                        title="Move Down"
                                                    >
                                                        <ChevronDown size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => removeStep(idx)}
                                                        className="p-1 text-secondary-text hover:text-danger ml-1"
                                                        title="Remove Step"
                                                    >
                                                        <X size={14} />
                                                    </button>
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
                                                            {step.type?.startsWith('ASSERT') && !step.type?.includes('HIDDEN') && <CheckCircle2 size={10} className="text-emerald-500" />}
                                                            {step.type === 'ASSERT_HIDDEN' && <EyeOff size={10} className="text-rose-400" />}
                                                            <label className="text-[8px] font-mono text-secondary-text uppercase block">ACTION_TYPE</label>
                                                        </div>
                                                        <select
                                                            value={step.type}
                                                            onChange={(e) => updateStep(idx, 'type', e.target.value as any)}
                                                            className="w-full bg-surface border-sharp border-main px-2 py-1 text-[10px] font-mono text-accent focus:outline-none"
                                                        >
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
                                                        </select>
                                                    </div>
                                                    {['CLICK', 'DOUBLE_CLICK', 'RIGHT_CLICK', 'FILL', 'TYPE', 'HOVER', 'SELECT', 'CHECK', 'UNCHECK', 'SUBMIT', 'ASSERT_VISIBLE', 'ASSERT_HIDDEN', 'ASSERT_TEXT', 'ASSERT_VALUE', 'SCROLL'].includes(step.type) && (
                                                        <div>
                                                            <label className="text-[8px] font-mono text-secondary-text uppercase mb-1 block">UI_SELECTOR</label>
                                                            <input
                                                                value={step.selector || ''}
                                                                onChange={(e) => updateStep(idx, 'selector', e.target.value)}
                                                                className="w-full bg-surface border-sharp border-main px-2 py-1 text-[10px] font-mono text-primary-text focus:outline-none placeholder:opacity-20"
                                                                placeholder={step.type === 'SUBMIT' ? 'Submit Button (Optional)' : '#ID, .CLASS, or [PROP]'}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                {['GOTO', 'FILL', 'TYPE', 'KEY_PRESS', 'SELECT', 'ASSERT_TEXT', 'ASSERT_VALUE', 'ASSERT_URL', 'ASSERT_TITLE', 'WAIT'].includes(step.type) && (
                                                    <div>
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
                                                                                (step.type?.includes('ASSERT_URL') ? 'Substring of URL' : 'Data or expected text')
                                                            }
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Execution Activity */}
                            <div className="lg:col-span-2 flex flex-col border-sharp border-main bg-surface/30 overflow-hidden relative min-h-[300px]">
                                {executing && ( // Changed executing to isPlaying
                                    <div className="absolute inset-0 bg-deep/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                                        <Loader2 className="animate-spin text-accent mb-4" size={48} />
                                        <h2 className="text-sm font-mono font-bold text-accent uppercase tracking-[0.2em] mb-2">SPOOLING_BROWSER</h2>
                                        <span className="text-[10px] font-mono text-secondary-text animate-pulse uppercase">Remote_Execution_Layer_Active</span>
                                    </div>
                                )}

                                <Tabs
                                    tabs={[
                                        { id: 'results', label: 'LIVE_LOGS' },
                                        { id: 'activity', label: 'ACTIVITY' }
                                    ]}
                                    activeTab={activeTab}
                                    onTabChange={(id) => setActiveTab(id as 'results' | 'activity')}
                                />

                                <div className="flex-1 overflow-hidden bg-deep custom-scrollbar">
                                    {activeTab === 'results' ? (
                                        <div className="p-4 h-full overflow-auto">
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
                                                        {(lastExecution.logs as any[]).map((log, li) => (
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
                                    ) : (
                                        <div className="flex flex-col h-full overflow-hidden">

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

                                                {projectHistory.map((ex: any, idx: number) => (
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
                {/* Script Editor Modal */}
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

                {/* Delete Confirmation Modal */}
                <Modal
                    isOpen={!!scenarioToDelete}
                    onClose={() => setScenarioToDelete(null)}
                    title="CONFIRM_DELETION"
                >
                    <div className="space-y-4">
                        <p className="text-sm font-mono text-secondary-text">
                            Are you sure you want to delete <span className="text-accent font-bold">{scenarioToDelete?.name}</span>?
                            This action cannot be undone and all execution history will be lost.
                        </p>
                        <div className="flex gap-3 pt-4">
                            <Button variant="ghost" onClick={() => setScenarioToDelete(null)} className="flex-1">CANCEL</Button>
                            <Button onClick={confirmDelete} className="flex-1 bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 border-rose-500/50">CONFIRM_DELETE</Button>
                        </div>
                    </div>
                </Modal>
            </div >
            {/* Recording Modal */}
            {showRecordModal && (
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
            )}
        </div>
    );
};

export default WebScenarios;
