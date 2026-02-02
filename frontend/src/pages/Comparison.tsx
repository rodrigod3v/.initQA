import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import Editor from '../components/Editor';
import {
    Activity,
    GitCompare,
    Loader2,
    Database,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Terminal
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

interface RequestModel {
    id: string;
    name: string;
}

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
    const { projectId } = useParams<{ projectId: string }>();
    const [requests, setRequests] = useState<RequestModel[]>([]);
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [selectedRequestId, setSelectedRequestId] = useState<string>('');
    const [leftEnvId, setLeftEnvId] = useState<string>('');
    const [rightEnvId, setRightEnvId] = useState<string>('');
    const [result, setResult] = useState<ComparisonResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [comparing, setComparing] = useState(false);

    useEffect(() => {
        fetchData();
    }, [projectId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [reqsRes, envsRes] = await Promise.all([
                api.get(`/requests?projectId=${projectId}`),
                api.get(`/projects/${projectId}/environments`)
            ]);
            setRequests(reqsRes.data);
            setEnvironments(envsRes.data);

            if (reqsRes.data.length > 0) setSelectedRequestId(reqsRes.data[0].id);
            if (envsRes.data.length > 1) {
                setLeftEnvId(envsRes.data[0].id);
                setRightEnvId(envsRes.data[1].id);
            }
        } catch (err) {
            console.error('Failed to fetch comparison data');
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

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="animate-spin text-accent mb-4" size={32} />
            <p className="text-[10px] font-mono text-secondary-text uppercase tracking-widest">Scanning Network Nodes...</p>
        </div>
    );

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] gap-4 overflow-hidden">
            {/* Control Bar - Industrial Selector */}
            <Card className="p-3 border-main bg-surface/30">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                            <Activity size={12} />
                            TARGET_PROC
                        </span>
                        <select
                            value={selectedRequestId}
                            onChange={(e) => setSelectedRequestId(e.target.value)}
                            className="bg-deep border-sharp border-main px-4 py-1.5 font-mono text-xs text-primary-text focus:outline-none focus:border-accent/50"
                        >
                            {requests.map(r => <option key={r.id} value={r.id}>{r.name.toUpperCase()}</option>)}
                        </select>
                    </div>

                    <div className="h-6 w-[1px] bg-main mx-2" />

                    <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2 flex-1">
                            <span className="text-[9px] font-mono text-secondary-text uppercase">NODE_A</span>
                            <select
                                value={leftEnvId}
                                onChange={(e) => setLeftEnvId(e.target.value)}
                                className="flex-1 bg-deep border-sharp border-main px-4 py-1.5 font-mono text-xs text-secondary-text focus:outline-none focus:border-accent/50"
                            >
                                <option value="">SELECT_ENV</option>
                                {environments.map(e => <option key={e.id} value={e.id}>{e.name.toUpperCase()}</option>)}
                            </select>
                        </div>
                        <GitCompare size={16} className="text-accent opacity-50" />
                        <div className="flex items-center gap-2 flex-1">
                            <span className="text-[9px] font-mono text-secondary-text uppercase">NODE_B</span>
                            <select
                                value={rightEnvId}
                                onChange={(e) => setRightEnvId(e.target.value)}
                                className="flex-1 bg-deep border-sharp border-main px-4 py-1.5 font-mono text-xs text-secondary-text focus:outline-none focus:border-accent/50"
                            >
                                <option value="">SELECT_ENV</option>
                                {environments.map(e => <option key={e.id} value={e.id}>{e.name.toUpperCase()}</option>)}
                            </select>
                        </div>
                    </div>

                    <Button
                        onClick={handleCompare}
                        disabled={comparing || !selectedRequestId || !leftEnvId || !rightEnvId}
                        glow
                        className="px-8 text-xs uppercase tracking-widest"
                    >
                        {comparing ? <Loader2 className="animate-spin mr-2" size={14} /> : <GitCompare className="mr-2" size={14} />}
                        Execute_Scan
                    </Button>
                </div>
            </Card>

            {/* Comparison Grid */}
            <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
                {/* Result A */}
                <div className="flex flex-col border-sharp border-main bg-surface/20 overflow-hidden">
                    <div className="px-4 py-2 bg-deep border-b border-main flex justify-between items-center">
                        <span className="text-[10px] font-mono font-bold text-secondary-text uppercase tracking-widest">DATA_FEED_A</span>
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
                    <div className="px-4 py-2 bg-deep border-b border-main flex justify-between items-center">
                        <span className="text-[10px] font-mono font-bold text-secondary-text uppercase tracking-widest">DATA_FEED_B</span>
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
