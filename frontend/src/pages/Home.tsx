import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/shared/api';
import { useProjectStore } from '@/stores/projectStore';
import {
    Rocket,
    Package,
    Send,
    Zap,
    Globe,
    CheckCircle2,
    XCircle,
    Loader2,
    ArrowRight,
    Activity,
    AlertTriangle,
    Clock,
    TrendingUp,
    Layers,
    LayoutDashboard
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';

interface HomeStats {
    global: {
        projects: number;
        requests: number;
        executions: number;
        successRate: number;
    };
    lastExecutions: Array<{
        id: string;
        type: 'API' | 'WEB' | 'LOAD';
        name: string;
        projectName: string;
        method?: string;
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
}

interface SectionItem {
    title: string;
    description: string;
    icon: any;
    color: string;
    path?: string;
    primary?: boolean;
    action?: () => void;
}

interface Section {
    title: string;
    description: string;
    items: SectionItem[];
}

const Home: React.FC = () => {
    const navigate = useNavigate();
    const { selectedProject } = useProjectStore();
    const [stats, setStats] = useState<HomeStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'overview' | 'analytics'>('overview');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/dashboard/stats');
                setStats(response.data);
            } catch (err) {
                console.error('Failed to fetch stats');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const getModulePath = (basePath: string) => {
        if (!selectedProject) return '/projects';

        switch (basePath) {
            case '/requests': return `/projects/${selectedProject.id}/requests`;
            case '/automation': return `/projects/${selectedProject.id}/web`;
            case '/performance': return `/projects/${selectedProject.id}/load`;
            default: return basePath;
        }
    };

    const sections: Section[] = [
        {
            title: 'CORE_ORCHESTRATION',
            description: 'Centralized project and workspace hub',
            items: [
                {
                    title: 'PROJECT_HUB',
                    description: 'Select or create testing workspace',
                    icon: Package,
                    color: 'accent',
                    path: '/projects',
                    primary: true
                },
                {
                    title: 'ANALYTICS_DASHBOARD',
                    description: 'Global system performance insights',
                    icon: LayoutDashboard,
                    color: 'cyan',
                    action: () => setView('analytics')
                }
            ]
        },
        {
            title: 'PLATFORM_SYNOPSIS',
            description: selectedProject
                ? `Direct entry to ${selectedProject.name} specialized modules`
                : 'Direct entry to specialized modules (Requires Active Project)',
            items: [
                {
                    title: 'API_PROTOCOL',
                    description: 'RESTful request orchestration',
                    icon: Send,
                    color: 'cyan',
                    path: getModulePath('/requests')
                },
                {
                    title: 'AUTOMATION',
                    description: 'Web scenario execution engine',
                    icon: Globe,
                    color: 'purple',
                    path: getModulePath('/automation')
                },
                {
                    title: 'PERFORMANCE',
                    description: 'K6 load testing suite',
                    icon: Zap,
                    color: 'amber',
                    path: getModulePath('/performance')
                }
            ]
        }
    ];

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    const formatNumber = (num: number) => {
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const getStatusBadge = (status: number) => {
        if (status >= 200 && status < 300) {
            return <CheckCircle2 size={14} className="text-emerald-500" />;
        }
        return <XCircle size={14} className="text-rose-500" />;
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'API': return 'text-cyan-500';
            case 'WEB': return 'text-purple-500';
            case 'LOAD': return 'text-amber-500';
            default: return 'text-accent';
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-[#03070c]">
                <div className="relative">
                    <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full" />
                    <Loader2 className="animate-spin text-accent relative h-10 w-10" />
                </div>
                <p className="mt-6 text-[10px] font-mono text-secondary-text uppercase tracking-[0.3em] animate-pulse">
                    Synchronizing Protocol...
                </p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-8 space-y-10 custom-scrollbar bg-[#03070c]">
            {/* Strategic Header */}
            <div className="relative group border border-accent/20 bg-accent/[0.02] p-10 overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl -mr-48 -mt-48 transition-opacity group-hover:opacity-60" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -ml-32 -mb-32" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-accent/10 border border-accent/30 rounded-lg">
                                <Rocket size={40} className="text-accent" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-mono font-bold text-accent uppercase tracking-tighter">
                                    CONTROL_CENTER
                                </h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                                    <span className="text-[10px] font-mono text-emerald-500/80 uppercase tracking-widest">
                                        System Ready • v1.2.0 {selectedProject && `• ACTIVE_${selectedProject.name.toUpperCase()}`}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs font-mono text-secondary-text max-w-2xl leading-relaxed uppercase tracking-wider">
                            Integrated Quality Assurance Protocol. Access project-scoped testing modules,
                            monitor global executions, and orchestrate system-wide performance benchmarks from this central hub.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={() => navigate('/projects')}
                            className="group font-mono text-xs uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)] bg-accent hover:bg-accent/90 border-transparent text-main"
                        >
                            {selectedProject ? 'Switch Project' : 'Enter Workspace'}
                            <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setView('overview')}
                                className={`flex-1 px-4 py-2 font-mono text-[9px] uppercase tracking-widest border transition-all ${view === 'overview' ? 'bg-accent/10 border-accent/40 text-accent' : 'border-main text-secondary-text hover:border-accent/20'}`}
                            >
                                OVERVIEW
                            </button>
                            <button
                                onClick={() => setView('analytics')}
                                className={`flex-1 px-4 py-2 font-mono text-[9px] uppercase tracking-widest border transition-all ${view === 'analytics' ? 'bg-accent/10 border-accent/40 text-accent' : 'border-main text-secondary-text hover:border-accent/20'}`}
                            >
                                ANALYTICS
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {view === 'overview' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Main Interaction Groups */}
                    <div className="lg:col-span-8 space-y-10">
                        {sections.map((section) => (
                            <div key={section.title}>
                                <div className="mb-4">
                                    <h2 className="text-[10px] font-mono font-bold text-accent/80 uppercase tracking-[0.2em]">
                                        {section.title}
                                    </h2>
                                    <p className="text-[8px] font-mono text-secondary-text/60 uppercase tracking-widest">
                                        {section.description}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {section.items.map((item) => (
                                        <button
                                            key={item.title}
                                            onClick={() => item.action ? item.action() : navigate(item.path!)}
                                            className={`
                                                group relative flex flex-col items-start gap-4 p-6 border transition-all duration-300
                                                ${item.primary
                                                    ? 'bg-accent/5 border-accent/30 hover:border-accent hover:bg-accent/10'
                                                    : 'bg-surface/30 border-main hover:border-accent/40 hover:bg-white/[0.02]'}
                                            `}
                                        >
                                            <div className={`p-3 rounded-lg border border-main group-hover:scale-110 transition-transform ${item.primary ? 'bg-accent/10 border-accent/20' : 'bg-surface'}`}>
                                                <item.icon size={24} className="text-accent" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="text-sm font-mono font-bold text-primary-text uppercase tracking-wider mb-1">
                                                    {item.title}
                                                </h3>
                                                <p className="text-[9px] font-mono text-secondary-text/80 uppercase tracking-wide leading-normal">
                                                    {item.description}
                                                </p>
                                            </div>
                                            <ArrowRight
                                                size={14}
                                                className="absolute bottom-6 right-6 text-accent/30 group-hover:text-accent group-hover:translate-x-1 transition-all"
                                            />
                                            <div className="absolute top-0 left-0 w-1 h-0 bg-accent group-hover:h-full transition-all duration-500" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Right Column: Platform Analytics & Activity */}
                    <div className="lg:col-span-4 space-y-10">
                        {/* Platform Pulse */}
                        {stats && (
                            <div>
                                <h2 className="text-[10px] font-mono font-bold text-accent/80 uppercase tracking-[0.2em] mb-4 text-center lg:text-left">
                                    PLATFORM_PULSE
                                </h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-surface/30 border border-main p-4 hover:border-accent/20 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <Package size={12} className="text-accent/40" />
                                            <span className="text-[8px] font-mono text-secondary-text uppercase tracking-widest">Assets</span>
                                        </div>
                                        <div className="text-xl font-mono font-bold text-accent tracking-tighter">
                                            {formatNumber(stats.global.projects)}
                                        </div>
                                    </div>
                                    <div className="bg-surface/30 border border-main p-4 hover:border-accent/20 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <Activity size={12} className="text-amber-500/40" />
                                            <span className="text-[8px] font-mono text-secondary-text uppercase tracking-widest">Runs</span>
                                        </div>
                                        <div className="text-xl font-mono font-bold text-amber-500 tracking-tighter">
                                            {formatNumber(stats.global.executions)}
                                        </div>
                                    </div>
                                    <div className="bg-surface/30 border border-main p-4 hover:border-accent/20 transition-colors col-span-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <CheckCircle2 size={12} className="text-emerald-500/40" />
                                            <span className="text-[8px] font-mono text-secondary-text uppercase tracking-widest">Stability</span>
                                        </div>
                                        <div className="flex items-end gap-3">
                                            <div className="text-2xl font-mono font-bold text-emerald-500 tracking-tighter">
                                                {stats.global.successRate.toFixed(1)}%
                                            </div>
                                            <div className="flex-1 h-1.5 bg-main/30 rounded-full mb-2 overflow-hidden" title="Average Success Rate">
                                                <div
                                                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                                    style={{ width: `${stats.global.successRate}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Compact Activity Feed */}
                        {stats && stats.lastExecutions && stats.lastExecutions.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-[10px] font-mono font-bold text-accent/80 uppercase tracking-[0.2em]">
                                        ACT_LOG
                                    </h2>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setView('analytics')}
                                        className="text-[8px] uppercase tracking-widest h-auto p-0 hover:bg-transparent hover:text-accent"
                                    >
                                        VIEW_DETAILED_ANALYTICS →
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    {stats.lastExecutions.slice(0, 4).map((exec, idx) => (
                                        <div
                                            key={exec.id || idx}
                                            className="group flex items-start gap-4 p-4 bg-surface/20 border border-main/50 hover:border-accent/30 transition-all cursor-pointer"
                                            onClick={() => navigate(exec.type === 'API' ? `/projects/${exec.id}/requests` : `/projects/${exec.id}`)}
                                        >
                                            <div className="mt-1">
                                                {getStatusBadge(exec.status)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className={`text-[8px] font-mono font-bold uppercase tracking-widest ${getTypeColor(exec.type)}`}>
                                                        {exec.type}
                                                    </span>
                                                    <span className="text-[8px] font-mono text-secondary-text tabular-nums">
                                                        {formatDuration(exec.duration)}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-mono text-primary-text truncate mt-1 group-hover:text-accent transition-colors">
                                                    {exec.name}
                                                </p>
                                                <div className="flex items-center gap-1 mt-1.5 opacity-60">
                                                    <Package size={10} className="text-secondary-text" />
                                                    <span className="text-[8px] font-mono text-secondary-text uppercase truncate">
                                                        {exec.projectName}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Analytics View Content */}
                    <div className="space-y-10">
                        {/* Unstable Nodes */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <AlertTriangle size={18} className="text-rose-500" />
                                <h2 className="text-[12px] font-mono font-bold text-primary-text uppercase tracking-[0.2em]">
                                    HIGH_SYMMETRY_VIOLATION_NODES
                                </h2>
                            </div>
                            <div className="bg-surface/30 border border-main overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-main/20 border-b border-main">
                                            <th className="px-4 py-3 text-[9px] font-mono text-secondary-text uppercase tracking-widest font-bold">Endpoint_Identity</th>
                                            <th className="px-4 py-3 text-[9px] font-mono text-secondary-text uppercase tracking-widest text-center font-bold">Fail_Rate</th>
                                            <th className="px-4 py-3 text-[9px] font-mono text-secondary-text uppercase tracking-widest text-right font-bold">Severity</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-main/50">
                                        {stats?.unstableRequests.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="p-10 text-center text-[10px] font-mono text-secondary-text uppercase italic tracking-widest">
                                                    Infrastructure Integrity Nominal - No Anomalies Detected
                                                </td>
                                            </tr>
                                        ) : stats?.unstableRequests.map((req, i) => (
                                            <tr key={i} className="hover:bg-accent/[0.02] transition-colors">
                                                <td className="px-4 py-4">
                                                    <div className="text-xs font-mono font-bold text-primary-text">{req.name}</div>
                                                    <div className="text-[8px] font-mono text-secondary-text uppercase italic mt-1">Total Samples: {req.total}</div>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <div className="inline-block px-2 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-500 text-[11px] font-mono font-bold">
                                                        {Math.round(req.failureRate)}%
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        {[...Array(5)].map((_, idx) => (
                                                            <div
                                                                key={idx}
                                                                className={`w-1.5 h-4 border transition-all ${idx < (req.failureRate / 20) ? 'bg-rose-500 border-rose-600 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'bg-main/20 border-main/40'}`}
                                                            />
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Efficiency Insight */}
                        <div className="bg-accent/5 border border-dashed border-accent/20 p-6 flex items-start gap-5">
                            <div className="p-3 bg-accent/10 border border-accent/30 text-accent">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <h4 className="text-[11px] font-mono font-bold text-primary-text uppercase tracking-widest mb-1 font-bold">
                                    Operational_Automation_Insight
                                </h4>
                                <p className="text-[10px] font-mono text-secondary-text leading-relaxed uppercase italic">
                                    {stats && stats.unstableRequests.length > 0
                                        ? `CRITICAL_INTERVENTION_REQUIRED: Symmetry violation detected in ${stats.unstableRequests[0].name}. Failure rates exceed acceptable operational parameters by ${(stats.unstableRequests[0].failureRate - 5).toFixed(1)}%.`
                                        : "All system parameters are within safe operating margins. Infrastructure efficiency at 100% theoretical yield."}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-10">
                        {/* Environment Failures */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Layers size={18} className="text-accent" />
                                <h2 className="text-[12px] font-mono font-bold text-primary-text uppercase tracking-[0.2em]">
                                    ENVIRONMENT_DISTORTION_MATRIX
                                </h2>
                            </div>
                            <div className="bg-surface/30 border border-main p-6 space-y-6">
                                {stats?.environmentFailures.length === 0 ? (
                                    <div className="p-10 text-center text-[10px] font-mono text-secondary-text uppercase italic tracking-widest">
                                        No Environmental Anomalies Recorded in Current Sync Cycle
                                    </div>
                                ) : stats?.environmentFailures.map((env, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest">
                                            <span className="text-secondary-text font-bold">{env.name}</span>
                                            <span className="text-rose-500 font-bold">{env.count} FAILures</span>
                                        </div>
                                        <div className="h-2 bg-main/20 border border-main/40 w-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-rose-500/50 to-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.3)] transition-all duration-1000"
                                                style={{ width: `${Math.min((env.count / (stats?.global.executions || 1)) * 100 * 5, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-surface/30 border border-main p-5 hover:border-accent/20 transition-all group">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-[9px] font-mono text-secondary-text uppercase tracking-widest">Active_Nodes</span>
                                    <Package size={14} className="text-accent/30 group-hover:text-accent group-hover:rotate-12 transition-all" />
                                </div>
                                <div className="text-2xl font-mono font-bold text-accent tracking-tighter">
                                    {stats?.global.projects}
                                </div>
                                <div className="text-[8px] font-mono text-secondary-text/50 uppercase italic mt-1 tracking-widest">Allocated sectors</div>
                            </div>
                            <div className="bg-surface/30 border border-main p-5 hover:border-accent/20 transition-all group">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-[9px] font-mono text-secondary-text uppercase tracking-widest">Defined_Procedures</span>
                                    <Clock size={14} className="text-accent/30 group-hover:text-accent group-hover:rotate-12 transition-all" />
                                </div>
                                <div className="text-2xl font-mono font-bold text-accent tracking-tighter">
                                    {stats?.global.requests}
                                </div>
                                <div className="text-[8px] font-mono text-secondary-text/50 uppercase italic mt-1 tracking-widest">Synchronized protocols</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;
