import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Editor from '../components/Editor';
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
    History
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Tabs } from '../components/ui/Tabs';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';

interface RequestModel {
    id: string;
    name?: string;
    method: string;
    url: string;
    headers: any;
    body: any;
    testScript?: string;
    expectedResponseSchema?: any;
    executions?: ExecutionResult[];
}

interface ExecutionResult {
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
}

const Requests: React.FC = () => {
    const navigate = useNavigate();
    const { projectId } = useParams<{ projectId: string }>();
    const [requests, setRequests] = useState<RequestModel[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<RequestModel | null>(null);
    const [loading, setLoading] = useState(true);
    const [executing, setExecuting] = useState(false);
    const [lastResult, setLastResult] = useState<ExecutionResult | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newRequestName, setNewRequestName] = useState('');
    const [saving, setSaving] = useState(false);
    const [history, setHistory] = useState<ExecutionResult[]>([]);
    const [copySuccess, setCopySuccess] = useState<string | null>(null);
    const [activeResultTab, setActiveResultTab] = useState('data');

    // Environment State
    const [environments, setEnvironments] = useState<any[]>([]);
    const [selectedEnvId, setSelectedEnvId] = useState<string>('');
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

    // Tab control
    const [activeTab, setActiveTab] = useState('payload');

    useEffect(() => {
        fetchRequests();
        fetchEnvironments();
    }, [projectId]);

    useEffect(() => {
        if (selectedRequest) {
            fetchHistory(selectedRequest.id);
        }
    }, [selectedRequest]);

    const fetchHistory = async (id: string) => {
        try {
            const response = await api.get(`/requests/${id}/history`);
            setHistory(response.data);
        } catch (err) {
            console.error('Failed to fetch history');
        }
    };

    const fetchEnvironments = async () => {
        if (!projectId) {
            setEnvironments([]);
            return;
        }
        try {
            const response = await api.get(`/projects/${projectId}/environments`);
            setEnvironments(response.data);
            if (response.data.length > 0 && !selectedEnvId) {
                setSelectedEnvId(response.data[0].id);
            }
        } catch (err) {
            console.error('Failed to fetch environments');
        }
    };

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const url = projectId ? `/requests?projectId=${projectId}` : '/requests';
            const response = await api.get(url);
            setRequests(response.data);

            // If we have a selected request already, update it with fresh data (including executions)
            if (selectedRequest) {
                const updated = response.data.find((r: any) => r.id === selectedRequest.id);
                if (updated) setSelectedRequest(updated);
            } else if (response.data.length > 0) {
                setSelectedRequest(response.data[0]);
            }
        } catch (err) {
            console.error('Failed to fetch requests');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEnvironment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await api.post(`/projects/${projectId}/environments`, {
                name: envName,
                variables: JSON.parse(envVariables)
            });
            setEnvironments([...environments, response.data]);
            setSelectedEnvId(response.data.id);
            setIsEnvModalOpen(false);
            setEnvName('');
        } catch (err) {
            console.error('Failed to create environment');
        }
    };

    const handleCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const isUrl = newRequestName.startsWith('http://') || newRequestName.startsWith('https://');
            const response = await api.post('/requests', {
                name: isUrl ? new URL(newRequestName).pathname.slice(1) || newRequestName : newRequestName,
                projectId,
                method: 'GET',
                url: isUrl ? newRequestName : 'https://api.example.com/status',
                headers: {},
                body: {}
            });
            setRequests([...requests, response.data]);
            setSelectedRequest(response.data);
            setNewRequestName('');
            setIsCreateModalOpen(false);
        } catch (err) {
            console.error('Failed to create request');
        }
    };

    const handleExecute = async () => {
        if (!selectedRequest) return;

        // Auto-save before execute
        setSaving(true);
        try {
            // Destructure to remove immutable fields
            const { id, projectId: pId, createdAt, updatedAt, executions, ...data } = selectedRequest as any;

            try { if (typeof data.body === 'string') data.body = JSON.parse(data.body); } catch (e) { }
            try { if (typeof data.headers === 'string') data.headers = JSON.parse(data.headers); } catch (e) { }
            try { if (typeof data.expectedResponseSchema === 'string') data.expectedResponseSchema = JSON.parse(data.expectedResponseSchema); } catch (e) { }

            await api.patch(`/requests/${selectedRequest.id}`, data);
            setRequests(requests.map(r => r.id === selectedRequest.id ? selectedRequest : r));
        } catch (err) {
            console.error('Auto-save failed before execution', err);
            setSaving(false);
            return; // STOP execution if save fails
        } finally {
            setSaving(false);
        }

        setExecuting(true);
        setLastResult(null);
        try {
            const response = await api.post(`/requests/${selectedRequest.id}/execute`, {
                environmentId: selectedEnvId || undefined
            });
            setLastResult(response.data);
            fetchRequests();
            fetchHistory(selectedRequest.id);
        } catch (err) {
            console.error('Execution failed');
        } finally {
            setExecuting(false);
        }
    };

    const handleCopy = (text: any, type: string) => {
        const content = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
        navigator.clipboard.writeText(content);
        setCopySuccess(type);
        setTimeout(() => setCopySuccess(null), 2000);
    };

    const handleLoadHistory = (execution: any) => {
        setLastResult(execution);
        setActiveResultTab('data');
    };

    const updateRequestField = (field: keyof RequestModel, value: any) => {
        if (!selectedRequest) return;
        setSelectedRequest({ ...selectedRequest, [field]: value });
    };

    const handleSave = async () => {
        if (!selectedRequest) return;
        setSaving(true);
        try {
            const { id, projectId: pId, createdAt, updatedAt, executions, ...data } = selectedRequest as any;

            try { if (typeof data.body === 'string') data.body = JSON.parse(data.body); } catch (e) { }
            try { if (typeof data.headers === 'string') data.headers = JSON.parse(data.headers); } catch (e) { }
            try { if (typeof data.expectedResponseSchema === 'string') data.expectedResponseSchema = JSON.parse(data.expectedResponseSchema); } catch (e) { }

            await api.patch(`/requests/${selectedRequest.id}`, data);
            setRequests(requests.map(r => r.id === selectedRequest.id ? selectedRequest : r));
        } catch (err) {
            console.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedRequest) return;
        setConfirmConfig({
            isOpen: true,
            title: 'DELETE_REQUEST_CONFIRMATION',
            message: `Permanently delete request "${selectedRequest.name}"? This action cannot be undone.`,
            confirmText: 'DELETE_REQUEST',
            onConfirm: async () => {
                try {
                    await api.delete(`/requests/${selectedRequest.id}`);
                    const updatedList = requests.filter(r => r.id !== selectedRequest.id);
                    setRequests(updatedList);
                    setSelectedRequest(updatedList.length > 0 ? updatedList[0] : null);
                } catch (err) {
                    console.error('Failed to delete');
                }
            }
        });
    };

    const handleClearHistory = async () => {
        if (!selectedRequest) return;
        setConfirmConfig({
            isOpen: true,
            title: 'CLEAR_HISTORY_CONFIRMATION',
            message: `Purge all execution history for "${selectedRequest.name}"? This process is irreversible.`,
            confirmText: 'CLEAR_HISTORY',
            onConfirm: async () => {
                try {
                    await api.delete(`/requests/${selectedRequest.id}/history`);
                    setHistory([]);
                } catch (err) {
                    console.error('Failed to clear history');
                }
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
        <div className="flex h-[calc(100vh-80px)] gap-4 overflow-hidden">
            <div className="w-72 flex flex-col border-sharp border-main bg-surface/50 overflow-hidden shrink-0">
                <div className="h-10 border-b border-main flex justify-between items-center bg-deep/50 px-3 shrink-0">
                    <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                        <Database size={14} />
                        COLLECTIONS
                    </span>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="text-accent hover:text-white transition-all hover:scale-110 active:scale-95"
                        title="Create New Request"
                    >
                        <Plus size={18} />
                    </button>
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
                                    setSelectedRequest(req);
                                    setLastResult(null);
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
                                <span className="text-[11px] font-mono truncate uppercase flex-1">{req.name || 'UNNAMED_PROC'}</span>
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
                                    disabled={saving}
                                    className="px-3 text-[10px] uppercase tracking-widest gap-2 bg-deep/50 hover:bg-surface border-main"
                                    title="Save Changes"
                                >
                                    <Save size={14} className={saving ? 'animate-pulse text-accent' : ''} />
                                    <span>SAVE</span>
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
                                    { id: 'history', label: 'History' },
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
                                    {activeTab === 'history' && (
                                        <div className="absolute inset-0 overflow-auto custom-scrollbar p-2 space-y-3">
                                            {!selectedRequest.executions || selectedRequest.executions.length === 0 ? (
                                                <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                                                    <Clock size={24} className="mb-2" />
                                                    <p className="text-[10px] font-mono uppercase">Empty_Log_Stream</p>
                                                </div>
                                            ) : (
                                                selectedRequest.executions.map((exec) => (
                                                    <div key={exec.id} className="space-y-0.5">
                                                        <button
                                                            onClick={() => setLastResult(exec)}
                                                            className={`w-full p-2 border-sharp border bg-surface/30 hover:bg-surface/50 transition-colors flex items-center justify-between
                                                        ${lastResult?.id === exec.id ? 'border-accent/50 bg-accent/5 text-accent' : 'border-main'}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`p-1 border-sharp border ${exec.status < 400 ? 'text-emerald-500 border-emerald-500/20' : 'text-rose-500 border-rose-500/20'}`}>
                                                                    {exec.status < 400 ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                                                                </div>
                                                                <div className="text-left">
                                                                    <div className="text-[9px] font-mono font-bold uppercase tracking-tight">Status_{exec.status}</div>
                                                                    <div className="text-[7px] font-mono text-secondary-text opacity-70">{new Date((exec as any).createdAt).toLocaleString()}</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-[8px] font-mono text-secondary-text uppercase">{exec.duration}ms</div>
                                                        </button>

                                                        {lastResult?.id === exec.id && exec.testResults && (exec.testResults as any[]).length > 0 && (
                                                            <div className="mx-1 p-2 bg-deep/40 border-x border-b border-accent/20 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                                                <div className="flex items-center gap-1.5 mb-1 opacity-50">
                                                                    <Activity size={8} className="text-accent" />
                                                                    <span className="text-[7px] font-mono text-accent uppercase tracking-widest">Execution_Summary</span>
                                                                </div>
                                                                {(exec.testResults as any[]).map((test, ti) => (
                                                                    <div key={ti} className="flex justify-between items-center gap-4">
                                                                        <span className="text-[8px] font-mono text-primary-text truncate uppercase leading-none">{test.name}</span>
                                                                        <div className={`text-[8px] font-mono font-bold px-1 py-0.5 border-sharp ${test.pass ? 'text-emerald-500 bg-emerald-500/5' : 'text-rose-500 bg-rose-500/5'}`}>
                                                                            {test.pass ? 'PASSED' : 'FAILED'}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
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
                                    { id: 'history', label: 'History' }
                                ]}
                                activeTab={activeResultTab}
                                onTabChange={setActiveResultTab}
                            />

                            <div className="flex-1 overflow-hidden flex flex-col bg-deep relative">
                                {lastResult ? (
                                    <div className="flex-1 flex flex-col min-h-0">
                                        {activeResultTab === 'history' ? (
                                            <div className="flex-1 flex flex-col min-h-0">
                                                <div className="flex items-center justify-between p-2 border-b border-main bg-deep/30 shrink-0">
                                                    <span className="text-[8px] font-mono text-secondary-text uppercase tracking-widest pl-1">Storage_Limit: 10_Entries</span>
                                                    {history.length > 0 && (
                                                        <button
                                                            onClick={handleClearHistory}
                                                            className="text-[8px] font-mono text-rose-500/60 hover:text-rose-500 transition-colors uppercase pr-1 flex items-center gap-1"
                                                            title="Clear All History"
                                                        >
                                                            <Trash2 size={10} />
                                                            <span>Clear_All</span>
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex-1 overflow-auto custom-scrollbar p-2 space-y-1">
                                                    {history.length === 0 ? (
                                                        <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                                                            <History size={24} />
                                                            <p className="text-[8px] mt-2 tracking-widest uppercase">No_History_Found</p>
                                                        </div>
                                                    ) : (
                                                        history.map((h) => (
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
                                                                    <span className="text-[9px] font-mono text-secondary-text">{(h as any).createdAt ? new Date((h as any).createdAt).toLocaleTimeString() : 'RECENT'}</span>
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
                                        ) : activeResultTab === 'assertions' ? (
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
                                                        {lastResult.testResults.map((test, i) => (
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
                                        )}
                                    </div>
                                ) : (
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
        </div >
    );
};

export default Requests;
