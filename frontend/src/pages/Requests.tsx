import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
    Terminal
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Tabs } from '../components/ui/Tabs';
import { Modal } from '../components/ui/Modal';

interface RequestModel {
    id: string;
    name?: string;
    method: string;
    url: string;
    headers: any;
    body: any;
    testScript?: string;
    expectedResponseSchema?: any;
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
    const { projectId } = useParams<{ projectId: string }>();
    const [requests, setRequests] = useState<RequestModel[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<RequestModel | null>(null);
    const [loading, setLoading] = useState(true);
    const [executing, setExecuting] = useState(false);
    const [lastResult, setLastResult] = useState<ExecutionResult | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newRequestName, setNewRequestName] = useState('');
    const [saving, setSaving] = useState(false);

    // Environment State
    const [environments, setEnvironments] = useState<any[]>([]);
    const [selectedEnvId, setSelectedEnvId] = useState<string>('');
    const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
    const [envName, setEnvName] = useState('');
    const [envVariables, setEnvVariables] = useState('{\n  "BASE_URL": "https://api.example.com\"\n}');

    // Tab control
    const [activeTab, setActiveTab] = useState('body');

    useEffect(() => {
        fetchRequests();
        fetchEnvironments();
    }, [projectId]);

    const fetchEnvironments = async () => {
        if (!projectId) return;
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
            const response = await api.get(`/requests?projectId=${projectId}`);
            setRequests(response.data);
            if (response.data.length > 0 && !selectedRequest) {
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
        } catch (err) {
            console.error('Execution failed');
        } finally {
            setExecuting(false);
        }
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
        if (!confirm(`Delete request "${selectedRequest.name}"?`)) return;
        try {
            await api.delete(`/requests/${selectedRequest.id}`);
            const updatedList = requests.filter(r => r.id !== selectedRequest.id);
            setRequests(updatedList);
            setSelectedRequest(updatedList.length > 0 ? updatedList[0] : null);
        } catch (err) {
            console.error('Failed to delete');
        }
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
                <div className="p-3 border-b border-main flex justify-between items-center bg-deep/50">
                    <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                        <Database size={12} />
                        DIR_SCAN
                    </span>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="text-accent hover:text-white transition-colors"
                    >
                        <Plus size={16} />
                    </button>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar p-2 space-y-1">
                    {requests.map((req) => (
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
                    ))}
                </div>
            </div>

            {selectedRequest ? (
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                    <Card className="p-2 border-main bg-surface/30">
                        <div className="flex gap-2">
                            <div className="relative shrink-0">
                                <select
                                    value={selectedRequest.method}
                                    onChange={(e) => updateRequestField('method', e.target.value)}
                                    className="appearance-none bg-deep border-sharp border-main px-4 py-2 font-mono font-bold text-accent text-xs focus:outline-none focus:border-accent/50 cursor-pointer pr-8"
                                >
                                    {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <option key={m}>{m}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary-text pointer-events-none" />
                            </div>

                            <div className="relative shrink-0">
                                <select
                                    value={selectedEnvId}
                                    onChange={(e) => setSelectedEnvId(e.target.value)}
                                    className="appearance-none bg-deep border-sharp border-accent/30 px-4 py-2 font-mono font-bold text-accent text-xs focus:outline-none focus:border-accent/50 cursor-pointer pr-10"
                                >
                                    <option value="">NO_ENV</option>
                                    {environments.map(env => (
                                        <option key={env.id} value={env.id}>{env.name.toUpperCase()}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-accent pointer-events-none" />
                            </div>

                            <Button
                                variant="ghost"
                                onClick={() => setIsEnvModalOpen(true)}
                                className="aspect-square p-2 border-accent/20 text-accent/50 hover:text-accent"
                            >
                                <Plus size={16} />
                            </Button>

                            <input
                                type="text"
                                value={selectedRequest.url}
                                onChange={(e) => updateRequestField('url', e.target.value)}
                                className="flex-1 bg-deep border-sharp border-main px-4 py-2 text-xs text-primary-text font-mono focus:border-accent/50 focus:outline-none placeholder:text-secondary-text/30"
                                placeholder="PROTOCOL://HOST:PORT/ENDPOINT"
                            />
                            <Button
                                onClick={handleExecute}
                                disabled={executing}
                                glow
                                className="w-32 text-xs uppercase tracking-widest"
                            >
                                {executing ? <Loader2 className="animate-spin mr-2" size={14} /> : <Terminal className="mr-2" size={14} />}
                                Execute
                            </Button>
                            <Button variant="secondary" onClick={handleSave} disabled={saving} className="aspect-square p-2 border-accent/20">
                                <Save size={16} className={saving ? 'animate-pulse text-accent' : ''} />
                            </Button>
                            <Button variant="danger" onClick={handleDelete} className="aspect-square p-2">
                                <Trash2 size={16} />
                            </Button>
                        </div>
                    </Card>

                    <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
                        <div className="flex flex-col border-sharp border-main bg-surface/30 overflow-hidden">
                            <Tabs
                                tabs={[
                                    { id: 'body', label: 'Payload' },
                                    { id: 'headers', label: 'Headers' },
                                    { id: 'schema', label: 'Contract' },
                                    { id: 'tests', label: 'Tests' },
                                ]}
                                activeTab={activeTab}
                                onTabChange={setActiveTab}
                            />
                            <div className="flex-1 relative bg-deep">
                                <div className="absolute inset-0 p-2">
                                    {activeTab === 'body' && (
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
                                    {activeTab === 'schema' && (
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

                        <div className="flex flex-col border-sharp border-main bg-surface/30 overflow-hidden">
                            <div className="px-4 py-2 border-b border-main bg-deep/50 flex items-center justify-between">
                                <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                                    <Activity size={12} />
                                    OUTPUT_CONSOLE
                                </span>
                                {lastResult && (
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5">
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

                            <div className="flex-1 flex flex-col relative bg-deep overflow-hidden">
                                {lastResult ? (
                                    <div className="absolute inset-0 flex flex-col p-2 gap-2 overflow-hidden">
                                        {lastResult.validationResult && (
                                            <div className={`p-2 border-sharp flex items-center justify-between font-mono text-[9px] uppercase tracking-wider shrink-0
                                                ${lastResult.validationResult.valid
                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                                                    : 'bg-rose-500/10 border-rose-500/30 text-rose-500'}`}>
                                                <div className="flex items-center gap-2">
                                                    {lastResult.validationResult.valid ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                    CONTRACT: {lastResult.validationResult.valid ? 'PASSED' : 'FAILED'}
                                                </div>
                                            </div>
                                        )}

                                        {lastResult.testResults && lastResult.testResults.length > 0 && (
                                            <div className="grid grid-cols-2 gap-2 shrink-0">
                                                {lastResult.testResults.map((test, i) => (
                                                    <div key={i} className={`p-2 border-sharp flex flex-col font-mono text-[9px] uppercase tracking-wider
                                                        ${test.pass ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-rose-500/10 border-rose-500/30 text-rose-500'}`}>
                                                        <div className="flex items-center gap-2">
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
                                        )}

                                        <div className="flex-1 flex flex-col min-h-0 gap-2 overflow-hidden">
                                            <div className="flex-1 flex flex-col min-h-0 bg-deep border-sharp border-main overflow-hidden relative">
                                                <div className="px-3 py-1 bg-surface/50 text-[8px] font-mono text-secondary-text uppercase border-b border-main shrink-0">Raw_Data</div>
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
                title="Initialize_New_Node"
            >
                <form onSubmit={handleCreateRequest} className="space-y-6">
                    <Input
                        autoFocus
                        label="Node_Identifier"
                        placeholder="E.G. AUTH_VALIDATION"
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
                            Abort
                        </Button>
                        <Button
                            type="submit"
                            glow
                            className="flex-1 text-xs uppercase tracking-widest"
                        >
                            Initialize
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={isEnvModalOpen}
                onClose={() => setIsEnvModalOpen(false)}
                title="Configure_Environment"
            >
                <form onSubmit={handleCreateEnvironment} className="space-y-6">
                    <Input
                        autoFocus
                        label="Environment_Alias"
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
                            Abort
                        </Button>
                        <Button
                            type="submit"
                            glow
                            className="flex-1 text-xs uppercase tracking-widest"
                        >
                            Provision
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Requests;
