import React, { useState } from 'react';
import {
    Terminal,
    Database,
    Activity,
    Layers,
    Plus,
    ChevronDown,
    Trash2,
    Play,
    RotateCcw,
    Loader2,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import { MonacoEditor } from '@/shared/ui/MonacoEditor';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { httpRequestStyles as S } from './HttpRequest.styles';
import type { SyncStatus } from '@/stores/requestStore';
import type { RequestModel, ExecutionResult } from '@/shared/types/api';

interface HttpRequestViewProps {
    requests: RequestModel[];
    selectedRequest: RequestModel | null;
    onSelectRequest: (request: RequestModel | null) => void;
    onRunTest: () => void;
    onRunSuite: () => void;
    isRunningTest: boolean;
    isRunningSuite: boolean;
    testResult: ExecutionResult | null;
    projectHistory: ExecutionResult[];

    // Restoration Props
    projectId?: string;
    projects: any[];
    onSelectProject: (id: string) => void;
    environments: any[];
    selectedEnvId: string;
    onSelectEnv: (id: string) => void;
    onCreateEnv: (name: string, vars: string) => Promise<void>;
    onDeleteEnv: (id: string) => Promise<void>;
    syncStatus: SyncStatus;
    onSave: () => Promise<void>;
    onDelete: () => Promise<void>;
    onUpdateRequest: (field: keyof RequestModel, value: any) => void;
    onCreateRequest: (name: string) => Promise<void>;
    onClearHistory: () => Promise<void>;
}

export const HttpRequestView: React.FC<HttpRequestViewProps> = (props) => {
    const {
        requests,
        selectedRequest,
        onSelectRequest,
        onRunTest,
        onRunSuite,
        isRunningTest,
        isRunningSuite,
        testResult,
        projectHistory,
        projectId,
        projects,
        onSelectProject,
        environments,
        selectedEnvId,
        onSelectEnv,
        onCreateEnv,
        onDeleteEnv,
        onUpdateRequest,
        onCreateRequest,
        onClearHistory
    } = props;

    // Local UI State
    const [activeEditorTab, setActiveEditorTab] = useState('payload');
    const [activeResultTab, setActiveResultTab] = useState('response');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newRequestName, setNewRequestName] = useState('');
    const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
    const [envName, setEnvName] = useState('');
    const [envVariables, setEnvVariables] = useState('{\n  "BASE_URL": "https://api.example.com"\n}');

    // Auto-switch to history tab when running suite
    React.useEffect(() => {
        if (isRunningSuite) {
            setActiveResultTab('history');
        }
    }, [isRunningSuite]);


    const formatEditorValue = (val: any) => {
        if (!val) return '{}';
        if (typeof val === 'string') return val;
        return JSON.stringify(val, null, 2);
    };

    const handleCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        await onCreateRequest(newRequestName);
        setNewRequestName('');
        setIsCreateModalOpen(false);
    };

    const handleCreateEnv = async (e: React.FormEvent) => {
        e.preventDefault();
        await onCreateEnv(envName, envVariables);
        setEnvName('');
        setIsEnvModalOpen(false);
    };

    return (
        <div className={S.container}>
            {/* Header */}
            <header className={S.header}>
                <div className={S.headerBrandContainer}>
                    <div className={S.headerIconWrapper}>
                        <Terminal size={16} />
                    </div>
                    <div>
                        <h1 className={S.headerTitle}>HTTP_REQUEST_ARCHITECT</h1>
                        <p className={S.headerVersion}>Modular_Core.v2.1</p>
                    </div>
                </div>

                <div className={`${S.headerActions} flex-col lg:flex-row items-stretch lg:items-center gap-2 lg:gap-3 py-2 lg:py-0 w-full lg:w-auto h-auto lg:h-full`}>
                    <div className="flex items-center gap-2 lg:border-r border-main/50 pr-4 shrink-0 justify-between lg:justify-start">
                        <span className="text-[11px] font-mono text-secondary-text uppercase tracking-widest hidden lg:inline">Project:</span>
                        <select
                            value={projectId}
                            onChange={(e) => onSelectProject(e.target.value)}
                            className="bg-deep border border-sharp border-main text-[11px] font-mono text-accent focus:outline-none px-2 py-1 flex-1 lg:flex-none lg:min-w-[120px] h-8"
                        >
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    {selectedRequest && (
                        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 w-full lg:w-auto">
                            {/* Method & URL Group */}
                            <div className="flex items-center gap-1.5 h-8 flex-1">
                                <div className="relative h-full flex shrink-0 w-20 lg:w-auto">
                                    <select
                                        value={selectedRequest.method}
                                        onChange={(e) => onUpdateRequest('method', e.target.value)}
                                        className={S.methodSelect}
                                    >
                                        {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <option key={m}>{m}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-accent/50 pointer-events-none" />
                                </div>

                                <input
                                    type="text"
                                    value={selectedRequest.url}
                                    onChange={(e) => onUpdateRequest('url', e.target.value)}
                                    className={`${S.urlInput} min-w-0`}
                                    placeholder="HOST:PORT/ENDPOINT"
                                />
                            </div>

                            {/* Controls Row (Env + Actions) */}
                            <div className="flex items-center gap-2 h-8">
                                <div className="relative h-full flex shrink-0">
                                    <select
                                        value={selectedEnvId}
                                        onChange={(e) => onSelectEnv(e.target.value)}
                                        className={`${S.envSelect} border border-sharp border-main bg-deep px-3 min-w-[100px] focus:border-accent/50`}
                                    >
                                        <option value="">NO_ENV</option>
                                        {environments.map(env => (
                                            <option key={env.id} value={env.id}>{env.name.toUpperCase()}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-accent/50 pointer-events-none" />
                                </div>

                                {/* Env Actions */}
                                <div className="flex items-center bg-deep border border-sharp border-main h-full">
                                    <button
                                        onClick={() => setIsEnvModalOpen(true)}
                                        className="h-full px-2 hover:bg-accent/10 hover:text-accent text-secondary-text transition-colors border-r border-main/50"
                                        title="New Environment"
                                    >
                                        <Plus size={14} />
                                    </button>
                                    <button
                                        onClick={async () => { if (selectedEnvId) await onDeleteEnv(selectedEnvId); }}
                                        disabled={!selectedEnvId}
                                        className="h-full px-2 hover:bg-rose-500/10 hover:text-rose-500 text-secondary-text disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-secondary-text transition-colors"
                                        title="Delete Environment"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                <div className="w-px h-4 bg-main mx-1" />

                                <Button
                                    onClick={onRunTest}
                                    disabled={isRunningTest}
                                    glow
                                    className="px-4 lg:px-6 text-[10px] uppercase tracking-widest h-8 gap-2 shrink-0"
                                >
                                    {isRunningTest ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                                    <span className="hidden sm:inline">EXECUTE</span>
                                </Button>

                                <Button
                                    onClick={onRunSuite}
                                    disabled={isRunningSuite}
                                    variant="ghost"
                                    className="h-8 w-8 lg:w-auto px-0 lg:px-3 text-[11px] uppercase tracking-widest gap-2 bg-deep/30 border-main hover:border-accent/30"
                                    title="Run All Tests"
                                >
                                    {isRunningSuite ? <Loader2 size={12} className="animate-spin" /> : <Layers size={12} />}
                                    <span className="hidden lg:inline">ALL</span>
                                </Button>

                            </div>
                        </div>
                    )}
                </div>
            </header>

            <main className={S.main}>
                {/* Sidebar */}
                <aside className={S.sidebar}>
                    <div className={S.sidebarHeader}>
                        <span className={S.sidebarLabel}>COLLECTIONS</span>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className={S.sidebarSettingsIcon}
                            aria-label="Create new request"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                    <div className={S.sidebarContent}>
                        {requests.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-2">
                                <Database size={24} />
                                <p className="text-[9px] font-mono uppercase tracking-widest">NO_REQUESTS</p>
                            </div>
                        ) : (
                            requests.map(req => (
                                <button
                                    key={req.id}
                                    onClick={() => onSelectRequest(req)}
                                    className={S.requestItem(selectedRequest?.id === req.id)}
                                >
                                    <span className={S.requestMethodBadge(req.method)}>{req.method}</span>
                                    <span className={S.requestName}>{req.name || 'UNNAMED_PROC'}</span>
                                </button>
                            ))
                        )}
                    </div>
                </aside>

                {/* Editor Area */}
                <section className={S.editorContainer}>
                    {selectedRequest ? (
                        <>

                            {/* Main Tabs */}
                            <div className={S.editorBody}>
                                <div className={S.tabsContainer}>
                                    <button
                                        onClick={() => setActiveEditorTab('payload')}
                                        className={S.tab(activeEditorTab === 'payload')}
                                    >Body</button>
                                    <button
                                        onClick={() => setActiveEditorTab('headers')}
                                        className={S.tab(activeEditorTab === 'headers')}
                                    >Headers</button>
                                    <button
                                        onClick={() => setActiveEditorTab('contract')}
                                        className={S.tab(activeEditorTab === 'contract')}
                                    >Schema</button>
                                    <button
                                        onClick={() => setActiveEditorTab('tests')}
                                        className={S.tab(activeEditorTab === 'tests')}
                                    >Tests</button>
                                </div>

                                <div className="flex-1 min-h-0 relative">
                                    {activeEditorTab === 'payload' && (
                                        <MonacoEditor
                                            value={formatEditorValue(selectedRequest.body)}
                                            onChange={(val) => onUpdateRequest('body', val)}
                                        />
                                    )}
                                    {activeEditorTab === 'headers' && (
                                        <MonacoEditor
                                            value={formatEditorValue(selectedRequest.headers)}
                                            onChange={(val) => onUpdateRequest('headers', val)}
                                        />
                                    )}
                                    {activeEditorTab === 'contract' && (
                                        <MonacoEditor
                                            value={formatEditorValue(selectedRequest.expectedResponseSchema)}
                                            onChange={(val) => onUpdateRequest('expectedResponseSchema', val)}
                                        />
                                    )}
                                    {activeEditorTab === 'tests' && (
                                        <MonacoEditor
                                            value={selectedRequest.testScript || '// Assertions Script'}
                                            onChange={(val) => onUpdateRequest('testScript', val)}
                                            language="javascript"
                                        />
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className={S.editorPlaceholder}>
                            Awaiting_Protocol_Selection
                        </div>
                    )}
                </section>

                {/* Results Panel */}
                <section className={S.resultsPanel}>
                    {isRunningTest && (
                        <div className={S.executionOverlay}>
                            <Loader2 className="animate-spin text-accent mb-4" size={48} />
                            <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-widest">EXECUTING_TEST</span>
                        </div>
                    )}

                    <div className={S.resultsHeader}>
                        <div className={S.resultsTitle}>
                            <Activity size={14} />
                            <span>EXECUTION_LOGS</span>
                        </div>
                        {testResult && (
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-mono text-secondary-text">{testResult.duration}ms</span>
                                <div className={S.latestExecutionStatus(testResult.status)}>{testResult.status}</div>
                            </div>
                        )}
                    </div>

                    <div className={S.tabsContainer}>
                        <button
                            onClick={() => setActiveResultTab('response')}
                            className={S.tab(activeResultTab === 'response')}
                        >Response</button>
                        <button
                            onClick={() => setActiveResultTab('assertions')}
                            className={S.tab(activeResultTab === 'assertions')}
                        >Assertions</button>
                        <button
                            onClick={() => setActiveResultTab('history')}
                            className={S.tab(activeResultTab === 'history')}
                        >History</button>
                    </div>

                    <div className={S.resultsContent}>
                        {activeResultTab === 'response' && (
                            <div className="flex-1 relative">
                                {testResult ? (
                                    <MonacoEditor
                                        value={formatEditorValue(testResult.response.data)}
                                        onChange={() => { }}
                                        readOnly={true}
                                    />
                                ) : (
                                    <div className={S.editorPlaceholder}>No_Data</div>
                                )}
                            </div>
                        )}

                        {activeResultTab === 'assertions' && (
                            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                                {!testResult ? (
                                    <div className={S.editorPlaceholder}>NO_ASSERTIONS_DATA</div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* SCHEMA VALIDATION SECTION */}
                                        <div className="space-y-2">
                                            <h3 className="text-[10px] font-mono font-bold text-secondary-text uppercase tracking-widest pl-1">Contract_Validation</h3>

                                            {testResult.validationResult ? (
                                                <div className={`rounded-sm border ${testResult.validationResult.valid
                                                    ? 'bg-emerald-500/5 border-emerald-500/20'
                                                    : 'bg-rose-500/5 border-rose-500/20'}`}>

                                                    {/* Header Status */}
                                                    <div className={`px-3 py-2 flex items-center gap-2 border-b ${testResult.validationResult.valid
                                                        ? 'border-emerald-500/10 text-emerald-500'
                                                        : 'border-rose-500/10 text-rose-500'}`}>
                                                        {testResult.validationResult.valid ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                                        <span className="font-mono text-[11px] font-bold uppercase tracking-wider">
                                                            {testResult.validationResult.valid ? 'SCHEMA_MATCHED' : 'SCHEMA_VIOLATION'}
                                                        </span>
                                                    </div>

                                                    {/* Error Details */}
                                                    {!testResult.validationResult.valid && testResult.validationResult.errors && (
                                                        <div className="p-3 bg-deep/50 space-y-1">
                                                            {testResult.validationResult.errors.map((err: any, idx: number) => (
                                                                <div key={idx} className="font-mono text-[10px] text-rose-400 flex gap-2 items-start">
                                                                    <span className="opacity-50 mt-0.5">•</span>
                                                                    <span>
                                                                        <span className="opacity-70">{err.instancePath}</span> {err.message}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="p-3 border border-dashed border-main text-secondary-text text-[10px] font-mono italic opacity-50 text-center">
                                                    No schema defined for this request
                                                </div>
                                            )}
                                        </div>

                                        {/* TEST RESULTS SECTION */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-[10px] font-mono font-bold text-secondary-text uppercase tracking-widest pl-1">Test_Suite_Execution</h3>
                                                <span className="text-[9px] font-mono text-secondary-text opacity-50">
                                                    {testResult.testResults?.filter(t => t.pass).length || 0} / {testResult.testResults?.length || 0} PASS
                                                </span>
                                            </div>

                                            {testResult.testResults && testResult.testResults.length > 0 ? (
                                                <div className="space-y-2">
                                                    {testResult.testResults.map((test, i) => (
                                                        <div key={i} className={`group border transition-all ${test.pass
                                                            ? 'bg-emerald-500/5 border-emerald-500/10' // Minimal pass style
                                                            : 'bg-rose-500/5 border-rose-500/30' // Stronger fail style
                                                            }`}>
                                                            {/* Test Header */}
                                                            <div className="flex items-start gap-3 p-3">
                                                                <div className={`mt-0.5 shrink-0 ${test.pass ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                    {test.pass ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className={`font-mono text-[11px] font-medium leading-tight ${test.pass ? 'text-secondary-text group-hover:text-emerald-400' : 'text-rose-400'}`}>
                                                                        {test.name}
                                                                    </div>

                                                                    {/* Error Message Block */}
                                                                    {!test.pass && test.error && (
                                                                        <div className="mt-3 relative">
                                                                            <div className="absolute inset-0 bg-rose-950/20 pointer-events-none" />
                                                                            <pre className="relative p-2 text-[10px] font-mono text-rose-300 bg-black/20 border-l-2 border-rose-500/50 overflow-x-auto whitespace-pre-wrap break-all">
                                                                                {test.error}
                                                                            </pre>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-3 border border-dashed border-main text-secondary-text text-[10px] font-mono italic opacity-50 text-center">
                                                    No tests scripts executed
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeResultTab === 'history' && (
                            <div className="flex-1 flex flex-col min-h-0 bg-deep/20">
                                <div className="p-2 border-b border-main flex justify-between items-center opacity-60">
                                    <span className="text-[8px] font-mono uppercase tracking-widest pl-1">Recent_Activity</span>
                                    <button
                                        onClick={onClearHistory}
                                        className="text-[8px] font-mono text-rose-500/60 hover:text-rose-500"
                                    >Clear_All</button>
                                </div>
                                <div className={S.historyContainer}>
                                    {projectHistory.map((h, i) => (
                                        <div key={h.id || i} className={S.historyItem}>
                                            <div className="flex-1 min-w-0 pr-2">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={S.requestMethodBadge(h.request?.method || 'N/A')}>{h.request?.method || 'UNK'}</span>
                                                    <span className="text-[10px] font-mono text-primary truncate">{h.request?.name || 'Unknown_Request'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className={S.historyItemIndicator(h.status)} />
                                                    <div className={S.historyItemStatus}>Status_{h.status}</div>
                                                </div>

                                                {/* Error Message Display */}
                                                {(h.status === 0 || h.status >= 400 || h.response?.error) && (
                                                    <div className="mt-1.5 p-1.5 bg-rose-500/10 border border-rose-500/20 rounded text-[9px] font-mono text-rose-400 break-words leading-tight">
                                                        <span className="font-bold opacity-70 block mb-0.5">FAILURE_REASON:</span>
                                                        {h.response?.message || h.response?.error || 'Unknown Error'}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <span className={S.historyItemDuration}>{h.duration}ms</span>
                                                <RotateCcw size={10} className="text-secondary-text opacity-30 cursor-pointer hover:opacity-100 transition-opacity" title="Re-run" />
                                            </div>
                                        </div>
                                    ))}
                                    {projectHistory.length === 0 && (
                                        <div className="flex-1 flex flex-col items-center justify-center opacity-30 gap-2">
                                            <Activity size={32} />
                                            <p className="text-[10px] font-mono uppercase tracking-[0.2em]">History_Empty</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* Modals */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="CREATE_NEW_REQUEST"
            >
                <form onSubmit={handleCreateRequest} className="space-y-6">
                    <Input
                        autoFocus
                        label="Identifier"
                        placeholder="GET_USER_DATA"
                        value={newRequestName}
                        onChange={(e) => setNewRequestName(e.target.value)}
                        required
                    />
                    <div className="flex gap-3">
                        <Button variant="ghost" type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1">CANCEL</Button>
                        <Button type="submit" glow className="flex-1">CREATE_PROTOCOL</Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={isEnvModalOpen}
                onClose={() => setIsEnvModalOpen(false)}
                title="ENV_CONFIGURATION"
            >
                <form onSubmit={handleCreateEnv} className="space-y-6">
                    <Input
                        autoFocus
                        label="Name"
                        placeholder="STAGING"
                        value={envName}
                        onChange={(e) => setEnvName(e.target.value)}
                        required
                    />
                    <div className="space-y-1">
                        <label className="text-xs font-mono text-secondary-text uppercase">Variables_JSON</label>
                        <div className="h-48 border border-main">
                            <MonacoEditor
                                value={envVariables}
                                onChange={(val) => setEnvVariables(val || '{}')}
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" type="button" onClick={() => setIsEnvModalOpen(false)} className="flex-1">CANCEL</Button>
                        <Button type="submit" glow className="flex-1">SAVE_ENV</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
