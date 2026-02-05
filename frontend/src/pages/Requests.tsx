import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/shared/api';
import Editor from '@/shared/ui/Editor';
import {
    Plus,
    CheckCircle2,
    XCircle,
    Loader2,
    Activity,
    Database,
    Clock,
    Save,
    Trash2,
    ChevronDown,
    Terminal,
    Copy,
    RotateCcw,
    History,
    Play
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Card } from '@/shared/ui/Card';
import { Tabs } from '@/shared/ui/Tabs';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';

import { useRequestStore, type RequestModel } from '@/stores/requestStore';
import { useProjectMetadata } from '@/features/webScenario/hooks/useProjectMetadata';
import { useRequestHistory } from '@/features/requests/hooks/useRequestHistory';
import { useRequestExecution } from '@/features/requests/hooks/useRequestExecution';

const Requests: React.FC = () => {
    const navigate = useNavigate();
    const { projectId } = useParams<{ projectId: string }>();

    // Store Hooks
    // Store State - Optimized Subscriptions
    const requests = useRequestStore(state => state.requests);
    const selectedRequest = useRequestStore(state => state.selectedRequest);
    const loading = useRequestStore(state => state.isLoading);
    const syncStatus = useRequestStore(state => state.syncStatus);
    const runningRequests = useRequestStore(state => state.runningRequests);
    const batchExecuting = useRequestStore(state => state.batchExecuting);

    const fetchRequests = useRequestStore(state => state.fetchRequests);
    const selectRequest = useRequestStore(state => state.selectRequest);
    const updateLocalRequest = useRequestStore(state => state.updateLocalRequest);
    const saveRequest = useRequestStore(state => state.saveRequest);
    const deleteRequest = useRequestStore(state => state.deleteRequest);
    const batchExecute = useRequestStore(state => state.batchExecute);
    const viewExecution = useRequestStore(state => state.viewExecution);
    const clearProjectHistory = useRequestStore(state => state.clearProjectHistory);

    // Custom Hooks
    const {
        projects,
        environments,
        setEnvironments,
        selectedEnvId,
        setSelectedEnvId,
        selectedProjectId,
        setSelectedProjectId,
        fetchEnvironments
    } = useProjectMetadata(projectId);

    const effectiveProjectId = projectId || selectedProjectId;

    const {
        projectHistory,
        fetchProjectHistory
    } = useRequestHistory(effectiveProjectId, selectedRequest?.id);

    const {
        executing,
        lastExecution: lastResult,
        setLastExecution: setLastResult,
        handleExecute: runSingle
    } = useRequestExecution(selectedEnvId, fetchProjectHistory);

    // Local State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newRequestName, setNewRequestName] = useState('');
    const [copySuccess, setCopySuccess] = useState<string | null>(null);
    const [activeResultTab, setActiveResultTab] = useState('response');
    const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
    const [envName, setEnvName] = useState('');
    const [envVariables, setEnvVariables] = useState('{\n  "BASE_URL": "https://api.example.com\"\n}');

    // Confirmation State
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        confirmText?: string;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const [activeTab, setActiveTab] = useState('payload');

    useEffect(() => {
        if (effectiveProjectId) {
            fetchRequests(effectiveProjectId);
            fetchProjectHistory();
        }
    }, [effectiveProjectId]);

    const handleCreateEnvironment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await api.post(`/projects/${effectiveProjectId}/environments`, {
                name: envName,
                variables: JSON.parse(envVariables)
            });
            setIsEnvModalOpen(false);
            setEnvName('');
            setEnvironments([...environments, response.data]);
            setSelectedEnvId(response.data.id);
        } catch (err) {
            console.error('Failed to create environment');
        }
    };

    const handleCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const isUrl = newRequestName.startsWith('http://') || newRequestName.startsWith('https://');
            await api.post('/requests', {
                name: isUrl ? new URL(newRequestName).pathname.slice(1) || newRequestName : newRequestName,
                projectId: effectiveProjectId,
                method: 'GET',
                url: isUrl ? newRequestName : 'https://api.example.com/status',
                headers: {},
                body: {}
            });
            if (effectiveProjectId) {
                fetchRequests(effectiveProjectId);
                fetchEnvironments(effectiveProjectId);
            }
            setNewRequestName('');
            setIsCreateModalOpen(false);
        } catch (err) {
            console.error('Failed to create request');
        }
    };

    const handleExecute = async () => {
        if (!selectedRequest) return;
        setActiveResultTab('response');
        await runSingle(selectedRequest.id, () => saveRequest(selectedRequest.id));
    };

    const handleRunAll = async () => {
        const id = effectiveProjectId;
        if (!id || requests.length === 0) return;

        setActiveResultTab('activity');
        await batchExecute(id, selectedEnvId || undefined);
    };

    const handleCopy = (text: any, type: string) => {
        const content = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
        navigator.clipboard.writeText(content);
        setCopySuccess(type);
        setTimeout(() => setCopySuccess(null), 2000);
    };

    const handleLoadHistory = (execution: any) => {
        viewExecution(execution);
        setLastResult(execution);
        setActiveResultTab('response');
    };

    const updateRequestField = (field: keyof RequestModel, value: any) => {
        if (!selectedRequest) return;
        updateLocalRequest(selectedRequest.id, { [field]: value });
    };

    const handleSave = async () => {
        if (!selectedRequest) return;
        await saveRequest(selectedRequest.id);
    };

    const handleDelete = async () => {
        if (!selectedRequest) return;
        setConfirmConfig({
            isOpen: true,
            title: 'DELETE_REQUEST_CONFIRMATION',
            message: `Permanently delete request "${selectedRequest.name}"? This action cannot be undone.`,
            confirmText: 'DELETE_REQUEST',
            onConfirm: async () => {
                await deleteRequest(selectedRequest.id);
            }
        });
    };


    const handleClearProjectHistory = async () => {
        const id = effectiveProjectId;
        if (!id) return;
        setConfirmConfig({
            isOpen: true,
            title: 'CLEAR_PROJECT_HISTORY_CONFIRMATION',
            message: `Purge ENTIRE execution history for this project? All request logs will be PERMANENTLY DELETED.`,
            confirmText: 'PURGE_ALL_DATA',
            onConfirm: async () => {
                await clearProjectHistory(id);
                fetchProjectHistory();
            }
        });
    };

    const handleDeleteEnvironment = async () => {
        if (!selectedEnvId) return;
        const env = environments.find(e => e.id === selectedEnvId);
        if (!env) return;
        setConfirmConfig({
            isOpen: true,
            title: 'DELETE_ENV_CONFIRMATION',
            message: `Permanently delete environment "${env.name}"? All associated secret variables will be LOST.`,
            confirmText: 'DELETE_ENVIRONMENT',
            onConfirm: async () => {
                try {
                    await api.delete(`/projects/environments/${selectedEnvId}`);
                    const updatedEnvs = environments.filter(e => e.id !== selectedEnvId);
                    setEnvironments(updatedEnvs);
                    setSelectedEnvId(updatedEnvs.length > 0 ? updatedEnvs[0].id : '');
                } catch (err) {
                    console.error('Failed to delete environment');
                }
            }
        });
    };

    const formatEditorValue = (val: any) => {
        if (!val) return '{}';
        if (typeof val === 'string') return val;
        return JSON.stringify(val, null, 2);
    };

    if (loading) return (
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

            <div className="flex flex-1 gap-4 overflow-hidden">
                <div className="w-72 flex flex-col border-sharp border-main bg-surface/50 overflow-hidden shrink-0">
                    <div className="h-10 border-b border-main flex justify-between items-center bg-deep/50 px-3 shrink-0">
                        <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                            <Database size={14} /> COLLECTIONS
                        </span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="text-secondary-text hover:text-white transition-all hover:scale-110 active:scale-95"
                                title="Create New Request"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    {!projectId && (
                        <div className="p-3 bg-accent/5 border-b border-main">
                            <p className="text-[8px] font-mono text-secondary-text uppercase leading-tight">
                                Viewing all active protocols. Select a project for full implementation rights.
                            </p>
                            <Button
                                variant="ghost"
                                onClick={() => navigate('/projects')}
                                className="w-full mt-2 h-6 text-[8px] uppercase tracking-widest border-accent/20"
                            >
                                Switch_to_Project_Context
                            </Button>
                        </div>
                    )}
                    <div className="flex-1 overflow-auto custom-scrollbar p-2 space-y-1">
                        {requests.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 p-4 text-center">
                                <Database size={24} className="mb-2" />
                                <p className="text-[10px] font-mono uppercase tracking-widest">
                                    NO_REQUESTS_FOUND<br />
                                    [ Create_First ]
                                </p>
                            </div>
                        ) : (
                            requests.map((req) => (
                                <button
                                    key={req.id}
                                    onClick={() => {
                                        selectRequest(req);
                                    }}
                                    className={`w-full text-left p-2 border-sharp transition-all group flex items-center gap-2
                                    ${selectedRequest?.id === req.id
                                            ? 'bg-accent/10 border-accent/30 text-accent'
                                            : 'border-transparent text-secondary-text hover:bg-surface hover:text-primary-text'
                                        }`}
                                >
                                    <span className={`text-[8px] font-bold w-10 text-center py-0.5 border-sharp uppercase
                                    ${req.method === 'GET' ? 'text-emerald-500 border-emerald-500/30' :
                                            req.method === 'POST' ? 'text-cyan-500 border-cyan-500/30' :
                                                'text-amber-500 border-amber-500/30'
                                        }`}>
                                        {req.method}
                                    </span>
                                    <span className="text-[11px] font-mono truncate uppercase flex-1 text-left">{req.name || 'UNNAMED_PROC'}</span>
                                    {runningRequests.has(req.id) && (
                                        <div className="flex items-center gap-1 text-accent animate-pulse">
                                            <Loader2 size={8} className="animate-spin" />
                                            <span className="text-[7px] font-bold">RUNNING</span>
                                        </div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {selectedRequest ? (
                    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                        <Card className="p-2 border-main bg-surface/30">
                            <div className="flex gap-2 items-stretch h-10">
                                {/* Method Selector */}
                                <div className="relative shrink-0 flex">
                                    <select
                                        value={selectedRequest.method}
                                        onChange={(e) => updateRequestField('method', e.target.value)}
                                        className="appearance-none bg-deep border-sharp border-main px-4 font-mono font-bold text-accent text-xs focus:outline-none focus:border-accent/50 cursor-pointer pr-10 h-full"
                                    >
                                        {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <option key={m}>{m}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-text pointer-events-none" />
                                </div>

                                {/* Environment Selector */}
                                <div className="flex bg-deep border-sharp border-accent/30 shrink-0">
                                    <div className="relative h-full flex">
                                        <select
                                            value={selectedEnvId}
                                            onChange={(e) => setSelectedEnvId(e.target.value)}
                                            className="appearance-none bg-transparent h-full px-4 font-mono font-bold text-accent text-xs focus:outline-none cursor-pointer pr-10"
                                        >
                                            <option value="">NO_ENV</option>
                                            {environments.map(env => (
                                                <option key={env.id} value={env.id}>{env.name.toUpperCase()}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-accent/50 pointer-events-none" />
                                    </div>
                                    <div className="w-[1px] bg-accent/20 my-2" />
                                    <Button
                                        variant="ghost"
                                        onClick={() => setIsEnvModalOpen(true)}
                                        className="aspect-square p-0 h-full w-10 text-accent/50 hover:text-accent border-none rounded-none"
                                        title="Create New Environment"
                                    >
                                        <Plus size={14} />
                                    </Button>
                                    {selectedEnvId && (
                                        <Button
                                            variant="ghost"
                                            onClick={handleDeleteEnvironment}
                                            className="aspect-square p-0 h-full w-10 text-rose-500/40 hover:text-rose-500 border-none rounded-none"
                                            title="Delete Selected Environment"
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    )}
                                </div>

                                {/* URL Input */}
                                <input
                                    type="text"
                                    value={selectedRequest.url}
                                    onChange={(e) => updateRequestField('url', e.target.value)}
                                    className="flex-1 bg-deep border-sharp border-main px-4 text-xs text-primary-text font-mono focus:border-accent/50 focus:outline-none placeholder:text-secondary-text/30 h-full"
                                    placeholder="PROTOCOL://HOST:PORT/ENDPOINT"
                                />

                                {/* Actions */}
                                <Button
                                    onClick={handleExecute}
                                    disabled={executing}
                                    glow
                                    className="w-40 text-[10px] uppercase tracking-widest h-full"
                                    title="Run API Request"
                                >
                                    {executing ? <Loader2 className="animate-spin mr-2" size={14} /> : <Terminal className="mr-2" size={14} />}
                                    RUN_TEST
                                </Button>

                                {/* Actions Group */}
                                <div className="flex gap-1 h-full">
                                    <Button
                                        variant="secondary"
                                        onClick={handleSave}
                                        disabled={syncStatus === 'saving'}
                                        className="px-3 text-[10px] uppercase tracking-widest gap-2 bg-deep/50 hover:bg-surface border-main"
                                        title="Save Changes"
                                    >
                                        <Save size={14} className={syncStatus === 'saving' ? 'animate-pulse text-accent' : ''} />
                                        <span>{syncStatus === 'saving' ? 'SAVING' : syncStatus === 'saved' ? 'SAVED' : 'SAVE'}</span>
                                    </Button>

                                    <Button
                                        variant="danger"
                                        onClick={handleDelete}
                                        className="px-3 text-[10px] uppercase tracking-widest gap-2"
                                        title="Delete Request"
                                    >
                                        <Trash2 size={14} />
                                        <span>DELETE</span>
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
                            <div className="flex flex-col border-sharp border-main bg-surface/30 overflow-hidden">
                                <Tabs
                                    tabs={[
                                        { id: 'payload', label: 'Body' },
                                        { id: 'headers', label: 'Headers' },
                                        { id: 'contract', label: 'Schema' },
                                        { id: 'tests', label: 'Assertions' },
                                    ]}
                                    activeTab={activeTab}
                                    onTabChange={setActiveTab}
                                    rightContent={activeTab === 'payload' && (
                                        <button
                                            onClick={() => handleCopy(selectedRequest.body, 'payload')}
                                            className="flex items-center gap-1.5 text-[9px] font-mono text-secondary-text hover:text-accent transition-colors uppercase pr-2"
                                            title="Copy Body to Clipboard"
                                        >
                                            <Copy size={12} />
                                            <span>{copySuccess === 'payload' ? 'COPIED!' : 'COPY'}</span>
                                        </button>
                                    )}
                                />
                                <div className="flex-1 relative bg-deep">
                                    <div className="absolute inset-0 p-2">
                                        {activeTab === 'payload' && (
                                            <Editor
                                                value={formatEditorValue(selectedRequest.body)}
                                                onChange={(val) => updateRequestField('body', val)}
                                                height="100%"
                                            />
                                        )}
                                        {activeTab === 'headers' && (
                                            <Editor
                                                value={formatEditorValue(selectedRequest.headers)}
                                                onChange={(val) => updateRequestField('headers', val)}
                                                height="100%"
                                            />
                                        )}
                                        {activeTab === 'contract' && (
                                            <Editor
                                                value={formatEditorValue(selectedRequest.expectedResponseSchema)}
                                                onChange={(val) => updateRequestField('expectedResponseSchema', val)}
                                                height="100%"
                                            />
                                        )}
                                        {activeTab === 'tests' && (
                                            <Editor
                                                value={selectedRequest.testScript || '// pm.test("Status is 200", () => pm.response.to.have.status(200));'}
                                                onChange={(val) => updateRequestField('testScript', val)}
                                                height="100%"
                                                language="javascript"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col border-sharp border-main bg-surface/30 overflow-hidden relative">
                                {/* Execution Overlay */}
                                {executing && (
                                    <div className="absolute inset-0 bg-deep/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                                        <Loader2 className="animate-spin text-accent mb-4" size={48} />
                                        <h2 className="text-sm font-mono font-bold text-accent uppercase tracking-[0.2em] mb-2">RUNNING_TEST_SUITE</h2>
                                        <div className="flex items-center gap-2 text-[10px] font-mono text-secondary-text">
                                            <span className="animate-pulse">Processing_API_Request</span>
                                            <span className="text-accent/50">......</span>
                                            <span className="text-secondary-text/50">OK</span>
                                        </div>
                                    </div>
                                )}

                                <div className="h-10 border-b border-main bg-deep/50 flex items-center justify-between px-4 shrink-0">
                                    <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                                        <Activity size={14} />
                                        EXECUTION_RESULTS
                                    </span>
                                    {batchExecuting && (
                                        <div className="flex items-center gap-2 text-accent animate-pulse mr-4">
                                            <Loader2 size={10} className="animate-spin" />
                                            <span className="text-[8px] font-mono uppercase tracking-widest">Running_Suite...</span>
                                        </div>
                                    )}
                                    {lastResult && (
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={handleExecute}
                                                disabled={executing}
                                                className="text-accent/50 hover:text-accent transition-colors"
                                                title="Re-run Test"
                                            >
                                                <RotateCcw size={12} className={executing ? 'animate-spin' : ''} />
                                            </button>
                                            <div className="flex items-center gap-1.5 border-l border-main/30 pl-3 h-4">
                                                <Clock size={10} className="text-secondary-text" />
                                                <span className="text-[9px] font-mono text-secondary-text">{lastResult.duration}ms</span>
                                            </div>
                                            <div className={`px-2 py-0.5 border-sharp text-[9px] font-mono font-bold uppercase
                                            ${lastResult.status < 400 ? 'text-emerald-500 border-emerald-500/30' : 'text-rose-500 border-rose-500/30'}`}>
                                                STATUS_{lastResult.status}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Tabs
                                    tabs={[
                                        { id: 'response', label: 'Response_Body' },
                                        { id: 'assertions', label: 'Assertions' },
                                        { id: 'activity', label: 'Activity' }
                                    ]}
                                    activeTab={activeResultTab}
                                    onTabChange={setActiveResultTab}
                                />

                                <div className="flex-1 overflow-hidden flex flex-col bg-deep relative">
                                    {/* Main Result Area Content */}
                                    <div className="flex-1 flex flex-col min-h-0">
                                        {activeResultTab === 'activity' ? (
                                            /* ACTIVITY TAB CONTENT */
                                            <div className="flex-1 flex flex-col min-h-0 bg-deep/10">
                                                <div className="flex items-center justify-between p-2 border-b border-main bg-deep/30 shrink-0">
                                                    <span className="text-[8px] font-mono text-secondary-text uppercase tracking-widest pl-1">
                                                        Project_Activity: {projectHistory.length}_Entries
                                                    </span>
                                                    {projectHistory.length > 0 && (
                                                        <button
                                                            onClick={handleClearProjectHistory}
                                                            className="text-[8px] font-mono text-rose-500/60 hover:text-rose-500 transition-colors uppercase pr-1 flex items-center gap-1"
                                                            title="Clear All History"
                                                        >
                                                            <Trash2 size={10} />
                                                            <span>Purge_All</span>
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex-1 overflow-auto custom-scrollbar p-2 space-y-1">
                                                    {projectHistory.length === 0 ? (
                                                        <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                                                            <History size={24} />
                                                            <p className="text-[8px] mt-2 tracking-widest uppercase">No_Recent_Activity</p>
                                                        </div>
                                                    ) : (
                                                        projectHistory.map((h) => (
                                                            <button
                                                                key={h.id}
                                                                onClick={() => handleLoadHistory(h)}
                                                                className="w-full flex items-center justify-between p-2 border-sharp border-main/30 hover:bg-surface/50 group transition-all"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <span className={`text-[8px] font-bold px-1.5 border-sharp
                                                                    ${h.status < 400 ? 'text-emerald-500 border-emerald-500/30' : 'text-rose-500 border-rose-500/30'}`}>
                                                                        {h.status}
                                                                    </span>
                                                                    <span className="text-[9px] font-mono text-secondary-text truncate uppercase">{(h as any).request?.name || 'UNKNOWN_PROC'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[8px] font-mono text-secondary-text opacity-50">{h.duration}ms</span>
                                                                    <RotateCcw size={10} className="text-secondary-text opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </div>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        ) : lastResult ? (
                                            /* INDIVIDUAL RESULT CONTENT (Response or Assertions) */
                                            activeResultTab === 'assertions' ? (
                                                <div className="flex-1 overflow-auto custom-scrollbar space-y-2 p-2">
                                                    {lastResult.validationResult && (
                                                        <div className={`p-2 border-sharp flex items-center justify-between font-mono text-[9px] uppercase tracking-wider shrink-0
                                                        ${lastResult.validationResult.valid
                                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                                                                : 'bg-rose-500/10 border-rose-500/30 text-rose-500'}`}>
                                                            <div className="flex items-center gap-2">
                                                                {lastResult.validationResult.valid ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                                SCHEMA_VALIDATION: {lastResult.validationResult.valid ? 'PASSED' : 'FAILED'}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {lastResult.testResults && lastResult.testResults.length > 0 ? (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {lastResult.testResults.map((test: any, i: number) => (
                                                                <div key={i} className={`p-2 border-sharp flex flex-col font-mono text-[9px] uppercase tracking-wider
                                                                ${test.pass ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-rose-500/10 border-rose-500/30 text-rose-500'}`}>
                                                                    <div className="flex items-center gap-1.5">
                                                                        {test.pass ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                                                                        <span className="truncate">{test.name}</span>
                                                                    </div>
                                                                    {!test.pass && test.error && (
                                                                        <div className="mt-1 text-[8px] opacity-70 normal-case border-t border-rose-500/20 pt-1">
                                                                            {test.error}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                                                            <Terminal size={24} />
                                                            <p className="text-[8px] mt-2 tracking-widest uppercase">No_Assertions_Found</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex-1 flex flex-col min-h-0 p-2 gap-2 overflow-hidden">
                                                    <div className="flex-1 flex flex-col min-h-0 bg-deep border-sharp border-main overflow-hidden relative">
                                                        <div className="px-3 py-1 bg-surface/50 text-[8px] font-mono text-secondary-text uppercase border-b border-main flex justify-between items-center shrink-0">
                                                            <span>Response_Body</span>
                                                            <button
                                                                onClick={() => handleCopy(lastResult.response.data, 'response')}
                                                                className="text-accent/50 hover:text-accent transition-colors flex items-center gap-1"
                                                                title="Copy Response to Clipboard"
                                                            >
                                                                <Copy size={8} />
                                                                {copySuccess === 'response' ? 'COPIED' : 'COPY'}
                                                            </button>
                                                        </div>
                                                        <div className="flex-1 relative">
                                                            <Editor
                                                                value={typeof lastResult.response.data === 'string' ? lastResult.response.data : JSON.stringify(lastResult.response.data || {}, null, 2)}
                                                                onChange={() => { }}
                                                                readOnly={true}
                                                                height="100%"
                                                            />
                                                        </div>
                                                    </div>

                                                    {!lastResult.validationResult?.valid && lastResult.validationResult?.errors && (
                                                        <div className="h-40 flex flex-col border-sharp border-rose-500/30 bg-rose-500/5 overflow-hidden shrink-0">
                                                            <div className="px-3 py-1 bg-rose-500/20 text-[8px] font-mono text-rose-500 uppercase border-b border-rose-500/30">Schema_Violations</div>
                                                            <div className="flex-1 overflow-auto p-2 custom-scrollbar">
                                                                {lastResult.validationResult.errors.map((err: any, i: number) => (
                                                                    <div key={i} className="mb-2 text-[9px] font-mono text-rose-400">
                                                                        <span className="opacity-50 tracking-tighter">[{err.instancePath || 'ROOT'}]</span> {err.message}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        ) : (
                                            /* IDLE STATE */
                                            <div className="h-full flex flex-col items-center justify-center space-y-3 opacity-30">
                                                <Terminal size={40} className="text-secondary-text" />
                                                <p className="text-[10px] font-mono text-secondary-text uppercase tracking-widest text-center">
                                                    System Idle. // Awaiting Execution Protocol.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center border-sharp border-main bg-surface/20 opacity-40">
                        <Terminal size={48} className="text-secondary-text mb-4" />
                        <p className="text-[10px] font-mono text-secondary-text uppercase tracking-widest">Select Access Protocol to Begin Scan.</p>
                    </div>
                )}

                <Modal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    title="Create_New_Request"
                >
                    <form onSubmit={handleCreateRequest} className="space-y-6">
                        <Input
                            autoFocus
                            label="Request Name"
                            placeholder="E.G. GET_USER_PROFILE"
                            value={newRequestName}
                            onChange={(e) => setNewRequestName(e.target.value)}
                            required
                        />
                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="ghost"
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="flex-1 text-xs uppercase tracking-widest"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                glow
                                className="flex-1 text-xs uppercase tracking-widest gap-2"
                            >
                                <Plus size={14} />
                                Create_Request
                            </Button>
                        </div>
                    </form>
                </Modal>

                <Modal
                    isOpen={isEnvModalOpen}
                    onClose={() => setIsEnvModalOpen(false)}
                    title="Environment_Config"
                >
                    <form onSubmit={handleCreateEnvironment} className="space-y-6">
                        <Input
                            autoFocus
                            label="Environment Name"
                            placeholder="E.G. STAGING_BETA"
                            value={envName}
                            onChange={(e) => setEnvName(e.target.value)}
                            required
                        />
                        <div className="space-y-1">
                            <label className="text-xs font-mono text-secondary-text uppercase tracking-wider">Variables_JSON</label>
                            <div className="h-48 border-sharp border-main border">
                                <Editor
                                    value={envVariables}
                                    onChange={(val) => setEnvVariables(val || '{}')}
                                    height="100%"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="ghost"
                                type="button"
                                onClick={() => setIsEnvModalOpen(false)}
                                className="flex-1 text-xs uppercase tracking-widest"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                glow
                                className="flex-1 text-xs uppercase tracking-widest gap-2"
                            >
                                <Save size={14} />
                                Save_Config
                            </Button>
                        </div>
                    </form>
                </Modal>

                <ConfirmModal
                    isOpen={confirmConfig.isOpen}
                    onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
                    onConfirm={confirmConfig.onConfirm}
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    confirmText={confirmConfig.confirmText}
                />
            </div>
        </div>
    );
};

export default Requests;
