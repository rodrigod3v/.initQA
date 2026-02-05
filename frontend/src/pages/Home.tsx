import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api/index';
import {
    Rocket,
    Package,
    Send,
    Zap,
    Globe,
    BarChart3,
    GitCompare,
    CheckCircle2,
    XCircle,
    Loader2,
    ArrowRight,
    Activity
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

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
}

const Home: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<HomeStats | null>(null);
    const [loading, setLoading] = useState(true);

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

    const quickActions = [
        {
            title: 'PROJECTS',
            description: 'Manage test suites',
            icon: Package,
            color: 'accent',
            path: '/projects'
        },
        {
            title: 'API_TESTS',
            description: 'HTTP requests',
            icon: Send,
            color: 'cyan',
            path: '/projects'
        },
        {
            title: 'LOAD_TESTS',
            description: 'Performance tests',
            icon: Zap,
            color: 'amber',
            path: '/projects'
        },
        {
            title: 'WEB_TESTS',
            description: 'Automation scenarios',
            icon: Globe,
            color: 'purple',
            path: '/projects'
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
            <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="animate-spin text-accent mb-4" size={32} />
                <p className="text-[10px] font-mono text-secondary-text uppercase tracking-widest italic">
                    Initializing Protocol...
                </p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {/* Hero Section */}
            <div className="relative overflow-hidden border border-accent/30 bg-accent/5 p-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <Rocket size={32} className="text-accent" />
                        <h1 className="text-2xl font-mono font-bold text-accent uppercase tracking-wider">
                            INIT_QA_PROTOCOL
                        </h1>
                    </div>
                    <p className="text-sm font-mono text-primary-text mb-4 uppercase tracking-wide">
                        Quality Assurance Testing Platform
                    </p>
                    <p className="text-xs font-mono text-secondary-text max-w-2xl">
                        Comprehensive testing suite for API requests, load performance, and web automation scenarios.
                        Select a quick action below to begin.
                    </p>
                </div>
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-[10px] font-mono font-bold text-secondary-text uppercase tracking-widest mb-3">
                    QUICK_ACCESS
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <button
                                key={action.title}
                                onClick={() => navigate(action.path)}
                                className="group relative bg-surface border border-main hover:border-accent/50 p-6 transition-all hover:bg-accent/5"
                            >
                                <div className="flex flex-col items-start gap-3">
                                    <Icon size={28} className="text-accent group-hover:scale-110 transition-transform" />
                                    <div className="text-left">
                                        <h3 className="text-sm font-mono font-bold text-accent uppercase tracking-wider mb-1">
                                            {action.title}
                                        </h3>
                                        <p className="text-[10px] font-mono text-secondary-text uppercase tracking-wide">
                                            {action.description}
                                        </p>
                                    </div>
                                    <ArrowRight
                                        size={16}
                                        className="absolute bottom-4 right-4 text-accent/50 group-hover:text-accent group-hover:translate-x-1 transition-all"
                                    />
                                </div>
                                <div className="h-0.5 w-0 bg-accent group-hover:w-full transition-all duration-300 mt-4" />
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Quick Stats */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-surface border border-main p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[8px] font-mono text-secondary-text uppercase tracking-widest">Projects</span>
                            <Package size={14} className="text-accent/50" />
                        </div>
                        <div className="text-2xl font-mono font-bold text-accent">
                            {stats.global.projects}
                        </div>
                    </div>
                    <div className="bg-surface border border-main p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[8px] font-mono text-secondary-text uppercase tracking-widest">Requests</span>
                            <Send size={14} className="text-cyan-500/50" />
                        </div>
                        <div className="text-2xl font-mono font-bold text-cyan-500">
                            {stats.global.requests}
                        </div>
                    </div>
                    <div className="bg-surface border border-main p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[8px] font-mono text-secondary-text uppercase tracking-widest">Executions</span>
                            <Activity size={14} className="text-amber-500/50" />
                        </div>
                        <div className="text-2xl font-mono font-bold text-amber-500">
                            {formatNumber(stats.global.executions)}
                        </div>
                    </div>
                    <div className="bg-surface border border-main p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[8px] font-mono text-secondary-text uppercase tracking-widest">Success Rate</span>
                            <CheckCircle2 size={14} className="text-emerald-500/50" />
                        </div>
                        <div className="text-2xl font-mono font-bold text-emerald-500">
                            {stats.global.successRate.toFixed(1)}%
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Activity */}
            {stats && stats.lastExecutions && stats.lastExecutions.length > 0 && (
                <Card
                    title="RECENT_EXECUTIONS"
                    headerAction={
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/dashboard')}
                            className="text-[8px] uppercase tracking-widest"
                        >
                            View All →
                        </Button>
                    }
                >
                    <div className="space-y-2">
                        {stats.lastExecutions.slice(0, 5).map((exec, idx) => (
                            <div
                                key={exec.id || idx}
                                className="flex items-center gap-3 p-2 border border-main/50 hover:border-accent/30 hover:bg-accent/5 transition-all"
                            >
                                {getStatusBadge(exec.status)}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[8px] font-mono font-bold uppercase ${getTypeColor(exec.type)}`}>
                                            {exec.type}
                                        </span>
                                        {exec.method && (
                                            <span className="text-[8px] font-mono text-accent uppercase">
                                                {exec.method}
                                            </span>
                                        )}
                                        <span className="text-xs font-mono text-primary-text truncate">
                                            {exec.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[8px] font-mono text-secondary-text">
                                            {exec.projectName}
                                        </span>
                                        <span className="text-[8px] font-mono text-secondary-text">•</span>
                                        <span className="text-[8px] font-mono text-secondary-text">
                                            {formatDuration(exec.duration)}
                                        </span>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-mono font-bold ${exec.status >= 200 && exec.status < 300 ? 'text-emerald-500' : 'text-rose-500'
                                    }`}>
                                    {exec.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Secondary Actions */}
            <div className="border border-main/50 p-4 bg-surface/50">
                <h3 className="text-[8px] font-mono font-bold text-secondary-text uppercase tracking-widest mb-3">
                    ADDITIONAL_FUNCTIONS
                </h3>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/dashboard')}
                        className="text-[10px] uppercase tracking-wider"
                    >
                        <BarChart3 size={14} className="mr-2" />
                        Full Dashboard
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/comparison')}
                        className="text-[10px] uppercase tracking-wider"
                    >
                        <GitCompare size={14} className="mr-2" />
                        Compare Results
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Home;
