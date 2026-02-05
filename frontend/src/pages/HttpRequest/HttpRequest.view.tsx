import React, { useState } from 'react';
import {
    Terminal,
    Database,
    Activity,
    Plus,
    ChevronDown,
    Save,
    Trash2,
    Play,
    RotateCcw,
    Loader2,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import { MonacoEditor } from '../../components/MonacoEditor';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { httpRequestStyles as S } from './HttpRequest.styles';
import type { SyncStatus } from '../../stores/requestStore';
import type { RequestModel, ExecutionResult } from '../../types/api.ts';

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
        syncStatus,
        onSave,
        onDelete,
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

                <div className={S.headerActions}>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-secondary-text uppercase tracking-widest">Project:</span>
                        <select
                            value={projectId}
                            onChange={(e) => onSelectProject(e.target.value)}
                            className="bg-deep border border-sharp border-main text-[11px] font-mono text-accent focus:outline-none px-2 py-1 min-w-[150px] h-8"
                        >
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    <Button
                        onClick={onRunSuite}
                        disabled={isRunningSuite}
                        variant="ghost"
                        className="h-8 text-[11px] uppercase tracking-widest gap-2 bg-deep/30 border-main hover:border-accent/30"
                    >
                        {isRunningSuite ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                        Run_Batch
                    </Button>
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
                            {/* Top Bar */}
                            <div className={S.editorTopBar}>
                                <div className="relative h-full flex shrink-0">
                                    <select
                                        value={selectedRequest.method}
                                        onChange={(e) => onUpdateRequest('method', e.target.value)}
                                        className={S.methodSelect}
                                    >
                                        {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <option key={m}>{m}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-accent/50 pointer-events-none" />
                                </div>

                                <div className={S.envSelectorContainer}>
                                    <div className="relative h-full flex">
                                        <select
                                            value={selectedEnvId}
                                            onChange={(e) => onSelectEnv(e.target.value)}
                                            className={S.envSelect}
                                        >
                                            <option value="">NO_ENV</option>
                                            {environments.map(env => (
                                                <option key={env.id} value={env.id}>{env.name.toUpperCase()}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-accent/50 pointer-events-none" />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        onClick={async () => { if (selectedEnvId) await onDeleteEnv(selectedEnvId); }}
                                        className="h-full w-8 border-l border-main rounded-none hover:bg-rose-500/10 p-0"
                                        title="Delete Environment"
                                        aria-label="Delete selected environment"
                                    >
                                        <Trash2 size={12} className="text-rose-500/50" aria-hidden="true" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => setIsEnvModalOpen(true)}
                                        className="h-full w-8 border-l border-main rounded-none hover:bg-white/5 p-0"
                                        aria-label="Create new environment"
                                    >
                                        <Plus size={12} className="text-accent/50" aria-hidden="true" />
                                    </Button>
                                </div>

                                <input
                                    type="text"
                                    value={selectedRequest.url}
                                    onChange={(e) => onUpdateRequest('url', e.target.value)}
                                    className={S.urlInput}
                                    placeholder="HOST:PORT/ENDPOINT"
                                />

                                <Button
                                    onClick={onRunTest}
                                    disabled={isRunningTest}
                                    glow
                                    className="px-6 text-[10px] uppercase tracking-widest h-full gap-2"
                                >
                                    {isRunningTest ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                                    EXECUTE
                                </Button>

                                <div className="flex gap-1 h-full">
                                    <Button
                                        variant="secondary"
                                        onClick={onSave}
                                        className="px-3 bg-deep border-main text-[9px]"
                                        title="Save"
                                    >
                                        <Save size={14} className={syncStatus === 'saving' ? 'animate-pulse text-accent' : ''} />
                                    </Button>
                                    <Button
                                        variant="danger"
                                        onClick={onDelete}
                                        className="px-3 text-[9px]"
                                        title="Delete"
                                    >
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                            </div>

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
                            <div className="flex-1 overflow-auto p-4 space-y-2 custom-scrollbar">
                                {testResult?.validationResult && (
                                    <div className={`p-3 border border-sharp flex items-center justify-between font-mono text-[10px] uppercase tracking-wider ${testResult.validationResult.valid ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-rose-500/10 border-rose-500/30 text-rose-500'}`}>
                                        <div className="flex items-center gap-2">
                                            {testResult.validationResult.valid ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                            SCHEMA: {testResult.validationResult.valid ? 'PASSED' : 'FAILED'}
                                        </div>
                                    </div>
                                )}
                                {testResult?.testResults?.map((test, i) => (
                                    <div key={i} className={`p-3 border border-sharp flex flex-col font-mono text-[10px] uppercase tracking-wider ${test.pass ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-rose-500/10 border-rose-500/30 text-rose-500'}`}>
                                        <div className="flex items-center gap-2">
                                            {test.pass ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                                            <span>{test.name}</span>
                                        </div>
                                    </div>
                                ))}
                                {!testResult && <div className={S.editorPlaceholder}>No_Assertions</div>}
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
                                            <div className={S.historyItemMain}>
                                                <div className={S.historyItemIndicator(h.status)} />
                                                <div className={S.historyItemStatus}>Status_{h.status}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={S.historyItemDuration}>{h.duration}ms</span>
                                                <RotateCcw size={10} className="text-secondary-text opacity-30" />
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
