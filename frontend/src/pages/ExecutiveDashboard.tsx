import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/shared/api';
import {
    Activity,
    TrendingUp,
    TrendingDown,
    Clock,
    ShieldCheck,
    AlertCircle,
    BarChart3,
    ArrowRight,
    Zap,
    Target
} from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';

interface ExecutiveStats {
    healthScore: number;
    healthTrend: number;
    avgLatency: number;
    executionsTotal: number;
    environmentGaps: { name: string; avg: number }[];
    history: { date: string; passed: number; failed: number }[];
}

const ExecutiveDashboard: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const [stats, setStats] = useState<ExecutiveStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (projectId) {
            fetchStats();
        }
    }, [projectId]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/dashboard/executive/${projectId}`);
            setStats(response.data);
        } catch (err) {
            console.error('Failed to fetch executive stats');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <Activity className="animate-spin text-accent mr-3" />
            <span className="font-mono text-xs uppercase tracking-widest text-secondary-text">Compiling Executive Metrics...</span>
        </div>
    );

    if (!stats) return null;

    return (
        <div className="flex flex-col gap-6 p-2 lg:p-4 overflow-y-auto max-h-[calc(100vh-80px)]">
            {/* Header / KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 border-l-4 border-l-accent bg-surface/40">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-mono text-secondary-text uppercase tracking-tighter">API_HEALTH_SCORE</span>
                        <ShieldCheck size={16} className="text-accent" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold font-mono text-primary-text">{stats.healthScore}%</span>
                        <div className={`flex items-center text-[10px] font-bold ${stats.healthTrend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {stats.healthTrend >= 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                            {Math.abs(stats.healthTrend)}%
                        </div>
                    </div>
                    <p className="text-[9px] text-secondary-text mt-1 uppercase tracking-widest">Global success rate vs previous week</p>
                </Card>

                <Card className="p-4 border-l-4 border-l-blue-500 bg-surface/40">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-mono text-secondary-text uppercase tracking-tighter">AVG_LATENCY</span>
                        <Clock size={16} className="text-blue-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold font-mono text-primary-text">{stats.avgLatency}ms</span>
                    </div>
                    <p className="text-[9px] text-secondary-text mt-1 uppercase tracking-widest">Average response time across all nodes</p>
                </Card>

                <Card className="p-4 border-l-4 border-l-purple-500 bg-surface/40">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-mono text-secondary-text uppercase tracking-tighter">CI_CD_EXECUTIONS</span>
                        <Zap size={16} className="text-purple-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold font-mono text-primary-text">{stats.executionsTotal}</span>
                    </div>
                    <p className="text-[9px] text-secondary-text mt-1 uppercase tracking-widest">Total runs triggered this week</p>
                </Card>

                <Card className="p-4 border-l-4 border-l-amber-500 bg-surface/40">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-mono text-secondary-text uppercase tracking-tighter">STABILITY_RATING</span>
                        <Target size={16} className="text-amber-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold font-mono text-primary-text">
                            {stats.healthScore > 95 ? 'A+' : stats.healthScore > 85 ? 'B' : 'C-'}
                        </span>
                    </div>
                    <p className="text-[9px] text-secondary-text mt-1 uppercase tracking-widest">Overall project reliability index</p>
                </Card>
            </div>

            {/* Main Graphs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Health History */}
                <Card className="lg:col-span-2 p-4 border-main bg-deep/50">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xs font-bold font-mono text-primary-text uppercase tracking-[0.2em] flex items-center gap-2">
                            <BarChart3 size={14} className="text-accent" />
                            NETWORK_STABILITY_HISTORY
                        </h3>
                    </div>
                    <div className="h-48 flex items-end gap-1 px-2">
                        {stats.history.map((day, i) => {
                            const total = day.passed + day.failed;
                            const passHeight = total > 0 ? (day.passed / total) * 100 : 0;
                            const failHeight = total > 0 ? (day.failed / total) * 100 : 0;
                            return (
                                <div key={i} className="flex-1 flex flex-col justify-end group relative h-full">
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-surface border border-main p-1 rounded text-[8px] font-mono z-10 whitespace-nowrap">
                                        {day.date}: {day.passed}P / {day.failed}F
                                    </div>
                                    <div style={{ height: `${failHeight}%` }} className="bg-red-500/30 w-full hover:bg-red-500 transition-colors" />
                                    <div style={{ height: `${passHeight}%` }} className="bg-accent/30 w-full border-t border-accent/50 hover:bg-accent transition-colors" />
                                    <div className="mt-2 text-[8px] font-mono text-secondary-text rotate-45 origin-left truncate w-8">{day.date.split('-').slice(1).join('/')}</div>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Environment Gaps */}
                <Card className="p-4 border-main bg-deep/50">
                    <h3 className="text-xs font-bold font-mono text-primary-text uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <AlertCircle size={14} className="text-blue-500" />
                        ENV_PERFORMANCE_GAP
                    </h3>
                    <div className="space-y-4">
                        {stats.environmentGaps.map((env, i) => (
                            <div key={i} className="flex flex-col gap-1">
                                <div className="flex justify-between text-[10px] font-mono">
                                    <span className="text-secondary-text">{env.name}</span>
                                    <span className="text-primary-text font-bold">{env.avg}ms</span>
                                </div>
                                <div className="h-1.5 w-full bg-main/20 overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-1000"
                                        style={{ width: `${Math.min((env.avg / 1000) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                        {stats.environmentGaps.length === 0 && (
                            <p className="text-[10px] font-mono text-secondary-text italic text-center py-8">NO_DATA_REPORTED</p>
                        )}
                    </div>
                </Card>
            </div>

            {/* CTA Section */}
            <div className="flex justify-end gap-4 mt-4">
                <Button variant="secondary" onClick={() => fetchStats()} className="text-[10px] font-mono uppercase tracking-widest px-6">
                    REFRESH_ANALYTICS
                </Button>
                <Button glow onClick={() => navigate(`/projects/${projectId}/requests`)} className="text-[10px] font-mono uppercase tracking-widest px-8">
                    ENTER_TACTICAL_VIEW <ArrowRight size={14} className="ml-2" />
                </Button>
            </div>
        </div>
    );
};

export default ExecutiveDashboard;
