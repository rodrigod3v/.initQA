import React, { useState, useEffect } from 'react';
import api from '../services/api/index';
import {
    LayoutDashboard,
    Activity,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Layers,
    Send,
    Loader2,
    TrendingUp,
    Zap
} from 'lucide-react';
import { Card } from '../components/ui/Card';

interface DashboardStats {
    global: {
        projects: number;
        requests: number;
        executions: number;
        successRate: number;
    };
    lastExecutions: Array<{
        id: string;
        type: 'API' | 'WEB';
        name: string;
        projectName: string;
        method: string;
        status: number;
        duration: number;
        createdAt: string;
    }>;
    unstableRequests: Array<{
        name: string;
        total: number;
        failed: number;
        failureRate: number;
    }>;
    environmentFailures: Array<{
        name: string;
        count: number;
    }>;
    projectFailures: Array<{
        id: string;
        total: number;
        failed: number;
    }>;
}

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/dashboard/stats');
                setStats(response.data);
            } catch (err) {
                console.error('Failed to fetch dashboard stats');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="animate-spin text-accent mb-4" size={32} />
                <p className="text-[10px] font-mono text-secondary-text uppercase tracking-widest italic">Interrogating Master Data Nodes...</p>
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-main pb-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tighter text-primary-text flex items-center gap-2">
                        <LayoutDashboard size={20} className="text-accent" />
                        MACRO_VISION_DASHBOARD
                    </h1>
                    <p className="text-[10px] font-mono text-secondary-text uppercase tracking-widest mt-1">
                        System Health Status: <span className="text-emerald-500">OPERATIONAL</span>
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] font-mono text-secondary-text uppercase italic">Last Updated</span>
                        <span className="text-[10px] font-mono text-primary-text">{new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>

            {/* Global Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 border-l-2 border-l-accent relative overflow-hidden group">
                    <div className="flex justify-between items-start relative z-10 transition-transform group-hover:translate-x-1">
                        <div>
                            <p className="text-[9px] font-mono text-secondary-text uppercase tracking-widest mb-1">Total_Projects</p>
                            <h3 className="text-2xl font-bold text-primary-text">{stats.global.projects}</h3>
                        </div>
                        <Layers className="text-accent opacity-20 group-hover:opacity-40 transition-opacity" size={24} />
                    </div>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full -mr-8 -mt-8 blur-2xl" />
                </Card>

                <Card className="p-4 border-l-2 border-l-accent relative overflow-hidden group">
                    <div className="flex justify-between items-start relative z-10 transition-transform group-hover:translate-x-1">
                        <div>
                            <p className="text-[9px] font-mono text-secondary-text uppercase tracking-widest mb-1">Stored_Requests</p>
                            <h3 className="text-2xl font-bold text-primary-text">{stats.global.requests}</h3>
                        </div>
                        <Send className="text-accent opacity-20 group-hover:opacity-40 transition-opacity" size={24} />
                    </div>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full -mr-8 -mt-8 blur-2xl" />
                </Card>

                <Card className="p-4 border-l-2 border-l-accent relative overflow-hidden group">
                    <div className="flex justify-between items-start relative z-10 transition-transform group-hover:translate-x-1">
                        <div>
                            <p className="text-[9px] font-mono text-secondary-text uppercase tracking-widest mb-1">Total_Executions</p>
                            <h3 className="text-2xl font-bold text-primary-text">{stats.global.executions}</h3>
                        </div>
                        <Activity className="text-accent opacity-20 group-hover:opacity-40 transition-opacity" size={24} />
                    </div>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full -mr-8 -mt-8 blur-2xl" />
                </Card>

                <Card className={`p-4 border-l-2 ${stats.global.successRate > 90 ? 'border-l-emerald-500' : 'border-l-rose-500'} relative overflow-hidden group`}>
                    <div className="flex justify-between items-start relative z-10 transition-transform group-hover:translate-x-1">
                        <div>
                            <p className="text-[9px] font-mono text-secondary-text uppercase tracking-widest mb-1">Average_Success_Rate</p>
                            <h3 className={`text-2xl font-bold ${stats.global.successRate > 90 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {stats.global.successRate}%
                            </h3>
                        </div>
                        <TrendingUp className="text-accent opacity-20 group-hover:opacity-40 transition-opacity" size={24} />
                    </div>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full -mr-8 -mt-8 blur-2xl" />
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <Clock size={16} className="text-accent" />
                        <h2 className="text-[11px] font-mono font-bold text-primary-text uppercase tracking-widest">Recent_Activity_Protocol</h2>
                    </div>
                    <Card className="border-main overflow-hidden">
                        <div className="divide-y divide-main">
                            {stats.lastExecutions.length === 0 ? (
                                <div className="p-8 text-center text-[10px] font-mono text-secondary-text uppercase">No Activity Detected In Current Cycle</div>
                            ) : stats.lastExecutions.map((exec) => (
                                <div key={exec.id} className="p-3 hover:bg-surface/50 transition-colors flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 border-sharp border ${exec.status < 400 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-rose-500/10 border-rose-500/30 text-rose-500'}`}>
                                            {exec.type === 'WEB' ? <Zap size={12} /> : (exec.status < 400 ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[8px] font-mono uppercase px-1 ${exec.type === 'WEB' ? 'bg-accent/20 text-accent' : 'bg-surface border border-main text-secondary-text'}`}>{exec.type === 'WEB' ? 'WEB_FLOW' : exec.method}</span>
                                                <span className="text-[10px] font-mono font-bold text-primary-text truncate max-w-[150px]">{exec.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[8px] font-mono text-secondary-text uppercase tracking-tight italic">{exec.projectName}</span>
                                                <span className="text-[8px] font-mono text-secondary-text opacity-50">•</span>
                                                <span className="text-[8px] font-mono text-secondary-text">{new Date(exec.createdAt).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-[10px] font-mono font-bold ${exec.status < 400 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {exec.type === 'WEB' ? (exec.status === 200 ? 'SUCCESS' : 'FAILED') : `STATUS_${exec.status}`}
                                        </div>
                                        <div className="text-[8px] font-mono text-secondary-text uppercase">{exec.duration}ms</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Environment Failures Matrix */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <Layers size={16} className="text-accent" />
                        <h2 className="text-[11px] font-mono font-bold text-primary-text uppercase tracking-widest">Environment_Distortion_Matrix</h2>
                    </div>
                    <Card className="border-main p-4 bg-deep/50">
                        <div className="space-y-4">
                            {stats.environmentFailures.length === 0 ? (
                                <p className="text-[10px] font-mono text-secondary-text uppercase italic text-center py-4">No Environmental Anomalies Recorded</p>
                            ) : stats.environmentFailures.map((env, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono uppercase">
                                        <span className="text-primary-text">{env.name}</span>
                                        <span className="text-rose-500 font-bold">{env.count} FAILures</span>
                                    </div>
                                    <div className="h-1.5 bg-surface border border-main w-full overflow-hidden">
                                        <div
                                            className="h-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)] transition-all duration-1000"
                                            style={{ width: `${Math.min((env.count / stats.global.executions) * 100 * 5, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Project Overview Mini-Cards */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <Card className="p-3 border-main bg-surface/30">
                            <h4 className="text-[8px] font-mono text-secondary-text uppercase mb-2">Active_Sectors</h4>
                            <div className="text-lg font-bold text-accent font-mono">{stats.global.projects}</div>
                            <div className="text-[8px] font-mono text-secondary-text mt-1 uppercase">Allocated_Nodes</div>
                        </Card>
                        <Card className="p-3 border-main bg-surface/30">
                            <h4 className="text-[8px] font-mono text-secondary-text uppercase mb-2">Sync_Protocols</h4>
                            <div className="text-lg font-bold text-accent font-mono">{stats.global.requests}</div>
                            <div className="text-[8px] font-mono text-secondary-text mt-1 uppercase">Defined_Procedures</div>
                        </Card>
                    </div>
                </div>

                {/* Unstable Requests */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <AlertTriangle size={16} className="text-rose-500" />
                        <h2 className="text-[11px] font-mono font-bold text-primary-text uppercase tracking-widest">High_Symmetry_Violation_Nodes</h2>
                    </div>
                    <Card className="border-main overflow-hidden h-fit">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-deep border-b border-main">
                                    <th className="px-4 py-2 text-[8px] font-mono text-secondary-text uppercase tracking-widest">Endpoint_Identity</th>
                                    <th className="px-4 py-2 text-[8px] font-mono text-secondary-text uppercase tracking-widest text-center">Fail_Rate</th>
                                    <th className="px-4 py-2 text-[8px] font-mono text-secondary-text uppercase tracking-widest text-right">Severity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-main">
                                {stats.unstableRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="p-8 text-center text-[10px] font-mono text-secondary-text uppercase italic">Network Stability Confirmed - No Anomalies</td>
                                    </tr>
                                ) : stats.unstableRequests.map((req, i) => (
                                    <tr key={i} className="hover:bg-surface/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="text-[10px] font-mono font-bold text-primary-text">{req.name}</div>
                                            <div className="text-[8px] font-mono text-secondary-text uppercase italic">Samples: {req.total}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="inline-block px-2 py-0.5 bg-rose-500/10 border border-rose-500/30 text-rose-500 text-[10px] font-mono font-bold">
                                                {Math.round(req.failureRate)}%
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-0.5">
                                                {[...Array(5)].map((_, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`w-1 h-3 border-sharp border ${idx < (req.failureRate / 20) ? 'bg-rose-500 border-rose-600' : 'bg-surface border-main'}`}
                                                    />
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>

                    {/* Quick Insight */}
                    <Card className="border-accent/10 bg-accent/5 p-4 flex items-center gap-4 border-dashed">
                        <div className="p-2 border-sharp border bg-accent/10 border-accent/30 text-accent">
                            <Zap size={20} />
                        </div>
                        <div>
                            <h4 className="text-[10px] font-mono font-bold text-primary-text uppercase tracking-widest">Automation_Insight</h4>
                            <p className="text-[9px] font-mono text-secondary-text leading-tight mt-1 uppercase italic">
                                {stats.unstableRequests.length > 0
                                    ? `Priority Correction Required on ${stats.unstableRequests[0].name}. Failure rates exceed acceptable operational parameters.`
                                    : "All systems reporting nominal values. Infrastructure integrity is within safe operating margins."}
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
