import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/shared/api';
import Editor from '@/shared/ui/Editor';
import {
    Activity,
    GitCompare,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    Terminal
} from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';

import { useRequestStore } from '@/stores/requestStore';

interface Environment {
    id: string;
    name: string;
}

interface ComparisonResult {
    left: any;
    right: any;
    delta: any;
}

const Comparison: React.FC = () => {
    const navigate = useNavigate();
    const { projectId } = useParams<{ projectId: string }>();

    // Store Hooks
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

    useEffect(() => {
        if (projectId) {
            // Load requests from store
            if (requests.length === 0) {
                fetchRequests(projectId);
            }
            fetchEnvironments();
        }
    }, [projectId]);

    // Update selected request if none selected and requests load
    useEffect(() => {
        if (requests.length > 0 && !selectedRequestId) {
            setSelectedRequestId(requests[0].id);
        }
    }, [requests]);

    const fetchEnvironments = async () => {
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
        } catch (err) {
            console.error('Failed to fetch environments');
        } finally {
            setLoading(false);
        }
    };

    const handleCompare = async () => {
        if (!selectedRequestId || !leftEnvId || !rightEnvId) return;
        setComparing(true);
        try {
            const response = await api.post('/requests/compare', {
                requestId: selectedRequestId,
                leftEnvId,
                rightEnvId
            });
            setResult(response.data);
        } catch (err) {
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
                </div>
            </Card>

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
