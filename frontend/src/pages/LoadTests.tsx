import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '@/shared/api';
import {
    Plus,
    Play,
    Save,
    Loader2,
    Zap,
    BarChart3,
    X,
    FileText
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Tabs } from '@/shared/ui/Tabs';
import { Modal } from '@/shared/ui/Modal';
import { useLoadTestStore } from '@/stores/loadTestStore';
import { useProjectStore } from '@/stores/projectStore';

interface Environment {
    id: string;
    name: string;
}

const LoadTests: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();

    // Store Hooks
    const selectProject = useProjectStore(state => state.selectProject);

    // Store State - Optimized Subscriptions
    const tests = useLoadTestStore(state => state.tests);
    const selectedTest = useLoadTestStore(state => state.selectedTest);
    const loading = useLoadTestStore(state => state.isLoading);
    const executing = useLoadTestStore(state => state.isExecuting);
    const lastExecution = useLoadTestStore(state => state.lastResult);
    const history = useLoadTestStore(state => state.history);

    const fetchTests = useLoadTestStore(state => state.fetchTests);
    const createTest = useLoadTestStore(state => state.createTest);
    const updateTest = useLoadTestStore(state => state.updateTest);
    const executeTest = useLoadTestStore(state => state.executeTest);
    const selectTest = useLoadTestStore(state => state.selectTest);
    const setLastExecution = useLoadTestStore(state => state.setLastExecution);

    // Local UI State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newTestName, setNewTestName] = useState('');
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('config');
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || '');
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [selectedEnvId, setSelectedEnvId] = useState<string>('');

    useEffect(() => {
        const id = projectId || selectedProjectId;
        if (id) {
            fetchTests(id);
            fetchEnvironments(id);

            // Sync selected project in store for Sidebar context
            const syncProject = async () => {
                try {
                    const resp = await api.get(`/projects/${id}`);
                    selectProject(resp.data);
                } catch (err) {
                    console.error('Failed to sync project store');
                }
            };
            syncProject();
        }
        fetchProjects();
    }, [projectId, selectedProjectId, selectProject]);

    const fetchProjects = async () => {
        try {
            const response = await api.get('/projects');
            setProjects(response.data);
            if (!selectedProjectId && response.data.length > 0) {
                setSelectedProjectId(response.data[0].id);
            }
        } catch (err) {
            console.error('Failed to fetch projects');
        }
    };

    const fetchEnvironments = async (pId: string) => {
        try {
            const response = await api.get(`/projects/${pId}/environments`);
            setEnvironments(response.data);
            if (response.data.length > 0) {
                setSelectedEnvId(response.data[0].id);
            }
        } catch (err) {
            console.error('Failed to fetch environments');
        }
    };

    const handleCreateTest = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const targetProjectId = projectId || selectedProjectId;
            if (!targetProjectId) return;

            await createTest({
                name: newTestName,
                projectId: targetProjectId,
                config: {
                    targetUrl: 'http://localhost:3000/health',
                    stages: [
                        { duration: '30s', target: 20 },
                        { duration: '1m', target: 20 },
                        { duration: '30s', target: 0 }
                    ],
                    thresholdMs: 500
                }
            });
            setNewTestName('');
            setIsCreateModalOpen(false);
        } catch (err) {
            console.error('Failed to create test');
        }
    };

    const handleSave = async () => {
        if (!selectedTest) return;
        setSaving(true);
        try {
            await updateTest(selectedTest.id, {
                name: selectedTest.name,
                config: selectedTest.config
            });
        } catch (err) {
            console.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleExecute = async () => {
        if (!selectedTest) return;
        await executeTest(selectedTest.id, selectedEnvId || undefined);
        setActiveTab('results');
    };

    const updateConfig = (field: string, value: any) => {
        if (!selectedTest) return;
        updateTest(selectedTest.id, {
            config: { ...selectedTest.config, [field]: value }
        });
    };

    const updateStage = (idx: number, field: string, value: any) => {
        if (!selectedTest || !selectedTest.config.stages) return;
        const newStages = [...selectedTest.config.stages];
        newStages[idx] = { ...newStages[idx], [field]: value };
        updateConfig('stages', newStages);
    };

    const addStage = () => {
        if (!selectedTest) return;
        const newStages = [...(selectedTest.config.stages || []), { duration: '1m', target: 10 }];
        updateConfig('stages', newStages);
    };

    const removeStage = (idx: number) => {
        if (!selectedTest) return;
        const newStages = selectedTest.config.stages?.filter((_, i) => i !== idx);
        updateConfig('stages', newStages);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="animate-spin text-accent mb-4" size={32} />
            <p className="text-[10px] font-mono text-secondary-text uppercase tracking-widest">Hydrating Core Modules...</p>
        </div>
    );

    return (
        <div className="flex h-[calc(100vh-80px)] gap-4 overflow-hidden">
            {/* Tests List */}
            <div className="w-72 flex flex-col border-sharp border-main bg-surface/50 overflow-hidden shrink-0">
                <div className="h-10 border-b border-main flex justify-between items-center bg-deep/50 px-3 shrink-0">
                    <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                        <Zap size={14} />
                        LOAD_TESTS
                    </span>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="text-accent hover:text-white transition-all hover:scale-110 active:scale-95"
                    >
                        <Plus size={18} />
                    </button>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar p-2 space-y-1">
                    {tests.map(t => (
                        <button
                            key={t.id}
                            onClick={() => selectTest(t)}
                            className={`w-full text-left p-2 border-sharp transition-all flex items-center gap-2
                                ${selectedTest?.id === t.id ? 'bg-accent/10 border-accent/30 text-accent' : 'text-secondary-text hover:bg-surface hover:text-primary-text'}`}
                        >
                            <Zap size={14} className={selectedTest?.id === t.id ? 'text-accent' : 'text-secondary-text'} />
                            <span className="text-[11px] font-mono truncate uppercase flex-1">{t.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Test Configurator */}
            {selectedTest ? (
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                    <Card className="p-2 border-main bg-surface/30">
                        <div className="flex justify-between items-center h-10 gap-2">
                            <div className="flex items-center gap-2 flex-1">
                                <Zap className="text-accent" size={18} />
                                <input
                                    type="text"
                                    value={selectedTest.name}
                                    onChange={(e) => updateTest(selectedTest.id, { name: e.target.value })}
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
                                <Button
                                    onClick={handleSave}
                                    disabled={saving}
                                    variant="secondary"
                                    className="px-4 text-[10px] uppercase tracking-widest h-full"
                                >
                                    <Save size={14} className="mr-2" />
                                    SAVE
                                </Button>
                                <Button
                                    onClick={handleExecute}
                                    disabled={executing}
                                    glow
                                    className="px-6 text-[10px] uppercase tracking-widest h-full"
                                >
                                    {executing ? <Loader2 className="animate-spin mr-2" size={14} /> : <Play size={14} className="mr-2" />}
                                    FIRE_K6
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <div className="flex-1 grid grid-cols-5 gap-4 min-h-0">
                        {/* Config Panel */}
                        <div className="col-span-2 flex flex-col gap-4">
                            <Card className="flex-1 flex flex-col border-sharp border-main bg-surface/30 overflow-hidden">
                                <div className="h-10 border-b border-main bg-deep/50 flex items-center px-4 shrink-0">
                                    <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-widest">K6_CONFIG</span>
                                </div>
                                <div className="flex-1 overflow-auto p-4 space-y-6 custom-scrollbar">
                                    <div className="space-y-2">
                                        <label className="text-[8px] font-mono text-secondary-text uppercase block">TARGET_URL</label>
                                        <input
                                            value={selectedTest.config.targetUrl}
                                            onChange={(e) => updateConfig('targetUrl', e.target.value)}
                                            className="w-full bg-deep border-sharp border-main px-3 py-2 text-xs font-mono text-primary-text focus:border-accent/50 focus:outline-none"
                                            placeholder="http://..."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[8px] font-mono text-secondary-text uppercase block">P95_LATENCY_THRESHOLD (ms)</label>
                                        <input
                                            type="number"
                                            value={selectedTest.config.thresholdMs}
                                            onChange={(e) => updateConfig('thresholdMs', parseInt(e.target.value))}
                                            className="w-full bg-deep border-sharp border-main px-3 py-2 text-xs font-mono text-accent focus:border-accent/50 focus:outline-none"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[8px] font-mono text-secondary-text uppercase">RAMP_STAGE_CONTROL</label>
                                            <Button onClick={addStage} variant="ghost" className="h-5 text-[7px] px-2 border-accent/20">ADD_PHASE</Button>
                                        </div>
                                        <div className="space-y-2">
                                            {selectedTest.config.stages?.map((stage, idx) => (
                                                <div key={idx} className="flex gap-2 items-end group">
                                                    <div className="flex-1 grid grid-cols-2 gap-2 bg-deep/50 p-2 border border-main">
                                                        <div>
                                                            <p className="text-[7px] text-secondary-text uppercase mb-1">Duration</p>
                                                            <input
                                                                value={stage.duration}
                                                                onChange={(e) => updateStage(idx, 'duration', e.target.value)}
                                                                className="w-full bg-surface border-none text-[10px] font-mono text-primary-text focus:outline-none"
                                                            />
                                                        </div>
                                                        <div>
                                                            <p className="text-[7px] text-secondary-text uppercase mb-1">Target VUs</p>
                                                            <input
                                                                type="number"
                                                                value={stage.target}
                                                                onChange={(e) => updateStage(idx, 'target', parseInt(e.target.value))}
                                                                className="w-full bg-surface border-none text-[10px] font-mono text-accent focus:outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => removeStage(idx)}
                                                        className="mb-2 text-secondary-text hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Results Panel */}
                        <div className="col-span-3 flex flex-col border-sharp border-main bg-surface/30 overflow-hidden relative">
                            {executing && (
                                <div className="absolute inset-0 bg-deep/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                                    <div className="relative">
                                        <Loader2 className="animate-spin text-accent mb-4" size={64} />
                                        <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] text-accent" size={24} />
                                    </div>
                                    <h2 className="text-sm font-mono font-bold text-accent uppercase tracking-[0.2em] mb-2">ENGAGING_LOAD_GATORS</h2>
                                    <div className="flex flex-col items-center gap-1 opacity-50">
                                        <span className="text-[9px] font-mono text-secondary-text animate-pulse uppercase">Inhaling_K6_Metrics</span>
                                        <div className="w-48 h-1 bg-main mt-2 overflow-hidden">
                                            <div className="w-full h-full bg-accent animate-[shimmer_2s_infinite]"></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <Tabs
                                tabs={[
                                    { id: 'results', label: 'METRIC_SUMMARY' },
                                    { id: 'history', label: 'HISTORY' }
                                ]}
                                activeTab={activeTab}
                                onTabChange={setActiveTab}
                            />

                            <div className="flex-1 overflow-auto bg-deep p-4 custom-scrollbar">
                                {activeTab === 'results' ? (
                                    lastExecution ? (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="bg-surface/30 border border-main p-3">
                                                    <p className="text-[8px] font-mono text-secondary-text uppercase mb-1">Avg_Latency</p>
                                                    <p className="text-lg font-mono font-bold text-accent">{Math.round(lastExecution.results?.metrics?.http_req_duration?.values?.avg || 0)}ms</p>
                                                </div>
                                                <div className="bg-surface/30 border border-main p-3">
                                                    <p className="text-[8px] font-mono text-secondary-text uppercase mb-1">Throughput</p>
                                                    <p className="text-lg font-mono font-bold text-primary-text">{Math.round(lastExecution.results?.metrics?.http_reqs?.values?.rate || 0)}/s</p>
                                                </div>
                                                <div className={`border p-3 ${lastExecution.status === 'FINISHED' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-rose-500/10 border-rose-500/30 text-rose-500'}`}>
                                                    <p className="text-[8px] font-mono uppercase mb-1">Exit_Status</p>
                                                    <p className="text-lg font-mono font-bold">{lastExecution.status}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h3 className="text-[10px] font-mono font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                                                    <BarChart3 size={14} /> DISTRIBUTION_ANALYSIS
                                                </h3>
                                                <div className="space-y-3">
                                                    {[
                                                        { label: 'Minimum', value: 'min', color: 'text-primary-text' },
                                                        { label: 'Median', value: 'med', color: 'text-primary-text' },
                                                        { label: '90th Percentile', value: 'p(90)', color: 'text-accent' },
                                                        { label: '95th Percentile', value: 'p(95)', color: 'text-accent font-bold' },
                                                        { label: 'Maximum', value: 'max', color: 'text-rose-500' }
                                                    ].map(m => (
                                                        <div key={m.value} className="flex justify-between items-center border-b border-main/30 pb-1">
                                                            <span className="text-[9px] font-mono text-secondary-text uppercase">{m.label}</span>
                                                            <span className={`text-[10px] font-mono ${m.color}`}>
                                                                {Math.round(lastExecution.results?.metrics?.http_req_duration?.values?.[m.value] || 0)}ms
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="bg-surface/10 border border-main/30 p-4">
                                                <p className="text-[7px] font-mono text-secondary-text uppercase mb-3 flex items-center gap-2">
                                                    <FileText size={10} /> RAW_OUTPUT_LOGS
                                                </p>
                                                <pre className="text-[9px] font-mono text-secondary-text overflow-auto max-h-40 custom-scrollbar opacity-60">
                                                    {JSON.stringify(lastExecution.results, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                                            <Zap size={32} className="mb-4" />
                                            <p className="text-[10px] font-mono uppercase tracking-[0.2em]">Cannon_Primed<br />[ Start Ramp Up ]</p>
                                        </div>
                                    )
                                ) : (
                                    <div className="space-y-2">
                                        {history.map(ex => (
                                            <button
                                                key={ex.id}
                                                onClick={() => { setLastExecution(ex); setActiveTab('results'); }}
                                                className="w-full flex items-center justify-between p-2 border-sharp border-main/30 bg-surface/20 hover:bg-surface/50 transition-all"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-[8px] font-bold px-1.5 border-sharp ${ex.status === 'FINISHED' ? 'text-emerald-500 border-emerald-500/30' : 'text-rose-500 border-rose-500/30'}`}>
                                                        {ex.status}
                                                    </span>
                                                    <span className="text-[9px] font-mono text-secondary-text">{new Date(ex.createdAt).toLocaleString()}</span>
                                                </div>
                                                <span className="text-[8px] font-mono opacity-50">{ex.duration}ms</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center opacity-20">
                    <BarChart3 size={64} className="mb-6" />
                    <p className="text-sm font-mono uppercase tracking-[0.4em]">Initialize_Load_Campaign</p>
                </div>
            )}

            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="REGISTER_NEW_LOAD_TEST"
            >
                <form onSubmit={handleCreateTest} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-mono text-secondary-text uppercase tracking-widest block">TEST_IDENTIFIER</label>
                        <input
                            autoFocus
                            value={newTestName}
                            onChange={(e) => setNewTestName(e.target.value)}
                            className="w-full bg-deep border-sharp border-main px-4 py-3 text-sm font-mono text-primary-text focus:border-accent/50 focus:outline-none"
                            placeholder="e.g. STRESS_TEST_PROD_API"
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
                        <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="flex-1">CANCEL</Button>
                        <Button type="submit" glow className="flex-1">CREATE_CAMPAIGN</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default LoadTests;
