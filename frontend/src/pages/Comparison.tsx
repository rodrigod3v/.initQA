import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/shared/api';
import Editor from '@/shared/ui/Editor';
import {
    Activity,
    GitCompare,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    Terminal,
    Shield,
    Clock,
    Hash,
    Settings2
} from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';

import { useRequestStore } from '@/stores/requestStore';

interface Environment {
    id: string;
    name: string;
}

interface ComparisonResult {
    left: {
        status: number;
        duration: number;
        response: {
            data: unknown;
        };
    };
    right: {
        status: number;
        duration: number;
        response: {
            data: unknown;
        };
    };
    delta: unknown;
}

const Comparison: React.FC = () => {
    const navigate = useNavigate();
    const { projectId } = useParams<{ projectId: string }>();

    // Store State - Optimized Subscriptions
    const requests = useRequestStore(state => state.requests);
    const fetchRequests = useRequestStore(state => state.fetchRequests);

    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [selectedRequestId, setSelectedRequestId] = useState<string>('');
    const [leftEnvId, setLeftEnvId] = useState<string>('');
    const [rightEnvId, setRightEnvId] = useState<string>('');
    const [result, setResult] = useState<ComparisonResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [comparing, setComparing] = useState(false);
    const [maskingKeys, setMaskingKeys] = useState<string[]>(['token', 'password', 'cpf', 'email']);
    const [showSettings, setShowSettings] = useState(false);

    const fetchEnvironments = useCallback(async () => {
        if (!projectId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const response = await api.get(`/projects/${projectId}/environments`);
            setEnvironments(response.data);

            if (response.data.length > 1) {
                setLeftEnvId(response.data[0].id);
                setRightEnvId(response.data[1].id);
            }
        } catch {
            console.error('Failed to fetch environments');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        if (projectId) {
            // Load requests from store
            if (requests.length === 0) {
                fetchRequests(projectId);
            }
            fetchEnvironments();
        }
    }, [projectId, requests.length, fetchRequests, fetchEnvironments]);

    // Update selected request if none selected and requests load
    useEffect(() => {
        if (requests.length > 0 && !selectedRequestId) {
            setSelectedRequestId(requests[0].id);
        }
    }, [requests, selectedRequestId]);

    const toggleMaskingKey = (key: string) => {
        setMaskingKeys(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const handleCompare = async () => {
        if (!selectedRequestId || !leftEnvId || !rightEnvId) return;
        setComparing(true);
        try {
            const response = await api.post('/requests/compare', {
                requestId: selectedRequestId,
                leftEnvId,
                rightEnvId,
                maskingKeys
            });
            setResult(response.data);
        } catch {
            console.error('Comparison failed');
        } finally {
            setComparing(false);
        }
    };

    if (!projectId) return (
        <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="p-8 border-sharp border border-main bg-surface/30 text-center max-w-md">
                <GitCompare className="mx-auto text-accent mb-4 opacity-40" size={48} />
                <h2 className="text-lg font-bold text-primary-text mb-2 font-mono tracking-tighter uppercase">SCAN_INITIALIZATION_ERROR</h2>
                <p className="text-[10px] text-secondary-text mb-6 font-mono uppercase tracking-[0.2em] italic">
                    PROJECT_CONTEXT_UNDEFINED: SYMMETRY SCANS REQUIRE ACTIVE PROJECT MAPPING TO RESOLVE NETWORK NODES.
                </p>
                <Button onClick={() => navigate('/projects')} glow className="w-full text-[10px] tracking-widest uppercase py-3">
                    ENTER_PROJECT_DATABASE
                </Button>
            </div>
        </div>
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="animate-spin text-accent mb-4" size={32} />
            <p className="text-[10px] font-mono text-secondary-text uppercase tracking-widest">Scanning Network Nodes...</p>
        </div>
    );

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] gap-4 overflow-hidden">
            {/* Control Bar - Industrial Selector */}
            <Card className="p-2 border-main bg-surface/30">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 h-auto lg:h-10">
                    <div className="flex items-center gap-2 h-10 lg:h-auto">
                        <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                            <Activity size={14} />
                            SELECT_TEST
                        </span>
                        <select
                            value={selectedRequestId}
                            onChange={(e) => setSelectedRequestId(e.target.value)}
                            className="bg-deep border-sharp border-main px-4 font-mono text-xs text-primary-text focus:outline-none focus:border-accent/50 h-full flex-1 lg:flex-none lg:w-48"
                        >
                            {requests.map(r => <option key={r.id} value={r.id}>{(r.name || 'Unnamed').toUpperCase()}</option>)}
                        </select>
                    </div>

                    <div className="hidden lg:block h-full w-[1px] bg-main/30" />

                    <div className="flex flex-col sm:flex-row items-stretch gap-4 flex-1">
                        <div className="flex items-center gap-2 flex-1 h-10 lg:h-auto">
                            <span className="text-[9px] font-mono text-secondary-text uppercase mb-1 sm:mb-0">SOURCE</span>
                            <select
                                value={leftEnvId}
                                onChange={(e) => setLeftEnvId(e.target.value)}
                                className="flex-1 bg-deep border-sharp border-main px-4 font-mono text-xs text-secondary-text focus:outline-none focus:border-accent/50 h-full"
                            >
                                <option value="">SELECT_ENVIRONMENT</option>
                                {environments.map(e => <option key={e.id} value={e.id}>{e.name.toUpperCase()}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center justify-center py-2 sm:py-0">
                            <GitCompare size={16} className="text-accent opacity-50 rotate-90 sm:rotate-0" />
                        </div>
                        <div className="flex items-center gap-2 flex-1 h-10 lg:h-auto">
                            <span className="text-[9px] font-mono text-secondary-text uppercase mb-1 sm:mb-0">TARGET</span>
                            <select
                                value={rightEnvId}
                                onChange={(e) => setRightEnvId(e.target.value)}
                                className="flex-1 bg-deep border-sharp border-main px-4 font-mono text-xs text-secondary-text focus:outline-none focus:border-accent/50 h-full"
                            >
                                <option value="">SELECT_ENVIRONMENT</option>
                                {environments.map(e => <option key={e.id} value={e.id}>{e.name.toUpperCase()}</option>)}
                            </select>
                        </div>
                    </div>

                    <Button
                        onClick={handleCompare}
                        disabled={comparing || !selectedRequestId || !leftEnvId || !rightEnvId}
                        glow
                        className="px-8 text-[10px] uppercase tracking-widest h-10 lg:h-full w-full lg:w-auto mt-2 lg:mt-0"
                        title="Compare Responses Between Environments"
                    >
                        {comparing ? <Loader2 className="animate-spin mr-2" size={14} /> : <GitCompare className="mr-2" size={14} />}
                        RUN_COMPARISON
                    </Button>

                    <Button
                        variant="secondary"
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-0 w-10 h-10 border-main ${showSettings ? 'bg-accent/20 text-accent' : ''}`}
                    >
                        <Settings2 size={16} />
                    </Button>
                </div>
            </Card>

            {/* Symmetry Settings Panel */}
            {showSettings && (
                <Card className="p-4 border-accent/30 bg-accent/5 animate-in slide-in-from-top duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Shield size={14} className="text-secondary-text" />
                                <h3 className="text-[10px] font-mono font-bold text-primary-text uppercase tracking-widest">SENSITIVE_DATA_MASKING</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {['token', 'password', 'cpf', 'email', 'auth', 'secret'].map(key => (
                                    <button
                                        key={key}
                                        onClick={() => toggleMaskingKey(key)}
                                        className={`px-3 py-1 border-sharp border font-mono text-[9px] uppercase transition-all
                                            ${maskingKeys.includes(key)
                                                ? 'bg-accent/20 border-accent text-accent'
                                                : 'bg-deep border-main text-secondary-text hover:border-accent/50'}`}
                                    >
                                        {key}
                                    </button>
                                ))}
                                <div className="flex items-center bg-deep border border-main px-2 ml-2">
                                    <Hash size={10} className="text-secondary-text mr-1" />
                                    <input
                                        type="text"
                                        placeholder="ADD_CUSTOM_KEY..."
                                        className="bg-transparent border-none outline-none text-[9px] font-mono text-primary-text w-24 h-6"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const val = e.currentTarget.value.trim().toLowerCase();
                                                if (val && !maskingKeys.includes(val)) toggleMaskingKey(val);
                                                e.currentTarget.value = '';
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <p className="text-[8px] text-secondary-text mt-3 font-mono opacity-60">
                                MASKED_FIELDS_WILL_BE_TREATED_AS_PLACEHOLDERS_TO_FOCUS_ON_STRUCTURAL_SYMMETRY.
                            </p>
                        </div>

                        <div className="border-l border-main/30 pl-8">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock size={14} className="text-secondary-text" />
                                <h3 className="text-[10px] font-mono font-bold text-primary-text uppercase tracking-widest">DRIFT_DETECTION_SCHEDULER</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-mono text-secondary-text uppercase">Health_Check_Integrity</span>
                                    <div className="flex items-center gap-3">
                                        <select className="bg-deep border-sharp border-main px-3 py-1 font-mono text-[9px] text-primary-text focus:outline-none">
                                            <option>EVERY_HOUR (0 * * * *)</option>
                                            <option>EVERY_15_MIN (*/15 * * * *)</option>
                                            <option>DAILY (0 0 * * *)</option>
                                        </select>
                                        <Button glow size="sm" className="text-[8px] h-7 px-4">SAVE_JOB</Button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-rose-500/10 border border-rose-500/20">
                                    <AlertTriangle size={12} className="text-rose-500" />
                                    <span className="text-[8px] font-mono text-rose-500 uppercase tracking-tighter">
                                        NOTIFICATIONS_OFF: CONFIGURE WEBHOOK_URL IN PROJECT SETTINGS FOR SLACK/TEAMS ALERTS.
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Comparison Grid */}
            <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2 gap-4 min-h-0 overflow-y-auto lg:overflow-hidden">
                {/* Result A */}
                <div className="flex flex-col border-sharp border-main bg-surface/20 overflow-hidden">
                    <div className="h-10 bg-deep border-b border-main flex justify-between items-center px-4 shrink-0">
                        <span className="text-[10px] font-mono font-bold text-secondary-text uppercase tracking-widest">RESULT_SOURCE</span>
                        {result && (
                            <div className="flex items-center gap-3">
                                <span className={`text-[9px] font-mono ${result.left.status < 400 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    S_{result.left.status}
                                </span>
                                <span className="text-[9px] font-mono text-secondary-text">{result.left.duration}ms</span>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 bg-deep p-1">
                        <Editor
                            value={result ? JSON.stringify(result.left.response.data, null, 2) : ''}
                            onChange={() => { }}
                            readOnly
                            height="100%"
                        />
                    </div>
                </div>

                {/* Result B */}
                <div className="flex flex-col border-sharp border-main bg-surface/20 overflow-hidden">
                    <div className="h-10 bg-deep border-b border-main flex justify-between items-center px-4 shrink-0">
                        <span className="text-[10px] font-mono font-bold text-secondary-text uppercase tracking-widest">RESULT_TARGET</span>
                        {result && (
                            <div className="flex items-center gap-3">
                                <span className={`text-[9px] font-mono ${result.right.status < 400 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    S_{result.right.status}
                                </span>
                                <span className="text-[9px] font-mono text-secondary-text">{result.right.duration}ms</span>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 bg-deep p-1">
                        <Editor
                            value={result ? JSON.stringify(result.right.response.data, null, 2) : ''}
                            onChange={() => { }}
                            readOnly
                            height="100%"
                        />
                    </div>
                </div>
            </div>

            {/* Diff Summary - Footer Overlay */}
            {result && (
                <Card className="border-accent/30 bg-accent/5 p-3 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-mono text-secondary-text uppercase">Identity_Status</span>
                            <div className={`flex items-center gap-2 font-mono text-xs font-bold uppercase
                                ${result.delta ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {result.delta ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                                {result.delta ? 'Symmetry_Violation_Detected' : 'Structural_Sync_Confirmed'}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-50">
                        <Terminal size={12} className="text-accent" />
                        <span className="text-[8px] font-mono text-accent uppercase tracking-widest">Sync_Engine_v1.0.4</span>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default Comparison;
