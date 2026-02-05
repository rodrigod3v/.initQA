import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Send,
    Monitor,
    Zap,
    GitCompare,
    Layers,
    ArrowRight,
    Activity,
    Clock
} from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import api from '@/shared/api';

interface ProjectStats {
    requests: number;
    scenarios: number;
    loadTests: number;
    recentActivity: Array<{
        id: string;
        type: 'request' | 'scenario' | 'loadtest';
        name: string;
        timestamp: string;
    }>;
}

const ProjectHub: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<any>(null);
    const [stats, setStats] = useState<ProjectStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProjectData = async () => {
            if (!projectId) return;

            try {
                // Fetch project details
                const projectRes = await api.get(`/projects/${projectId}`);
                setProject(projectRes.data);

                // Fetch stats
                const [requestsRes, scenariosRes, loadTestsRes] = await Promise.all([
                    api.get(`/requests?projectId=${projectId}`),
                    api.get(`/web-scenarios?projectId=${projectId}`),
                    api.get(`/load-tests?projectId=${projectId}`)
                ]);

                setStats({
                    requests: requestsRes.data.length,
                    scenarios: scenariosRes.data.length,
                    loadTests: loadTestsRes.data.length,
                    recentActivity: []
                });
            } catch (err) {
                console.error('Failed to fetch project data');
            } finally {
                setLoading(false);
            }
        };

        fetchProjectData();
    }, [projectId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Activity className="animate-spin text-accent" size={32} />
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center h-full opacity-30">
                <Layers size={64} className="mb-4" />
                <p className="text-sm font-mono uppercase tracking-widest">Project Not Found</p>
            </div>
        );
    }

    const testAreas = [
        {
            icon: Send,
            title: 'HTTP Requests',
            description: 'REST API Testing',
            count: stats?.requests || 0,
            path: `/projects/${projectId}/requests`,
            color: 'accent'
        },
        {
            icon: Monitor,
            title: 'Web Scenarios',
            description: 'Playwright Automation',
            count: stats?.scenarios || 0,
            path: `/projects/${projectId}/web`,
            color: 'accent'
        },
        {
            icon: Zap,
            title: 'K6 Load Tests',
            description: 'Performance Testing',
            count: stats?.loadTests || 0,
            path: `/projects/${projectId}/load`,
            color: 'accent'
        },
        {
            icon: GitCompare,
            title: 'Comparator',
            description: 'Response Analysis',
            count: null,
            path: '/comparison',
            color: 'accent'
        }
    ];

    return (
        <div className="space-y-6 p-6">
            {/* Project Header */}
            <div className="border-b border-main pb-4">
                <div className="flex items-center gap-3 mb-2">
                    <Layers className="text-accent" size={24} />
                    <h1 className="text-2xl font-bold tracking-tight text-primary-text uppercase">
                        {project.name}
                    </h1>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono text-secondary-text">
                    <div className="flex items-center gap-2">
                        <Clock size={12} />
                        <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            {/* Test Area Cards */}
            <div>
                <h2 className="text-xs font-mono font-bold text-secondary-text uppercase tracking-widest mb-4">
                    Test Modules
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {testAreas.map((area) => (
                        <Card
                            key={area.path}
                            className="p-6 border-main hover:border-accent/30 transition-all cursor-pointer group relative overflow-hidden"
                            onClick={() => navigate(area.path)}
                        >
                            <div className="relative z-10">
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-3 border-sharp border bg-accent/10 border-accent/30 text-accent`}>
                                        <area.icon size={24} />
                                    </div>
                                    <ArrowRight
                                        size={18}
                                        className="text-secondary-text group-hover:text-accent group-hover:translate-x-1 transition-all"
                                    />
                                </div>

                                <h3 className="text-sm font-mono font-bold text-primary-text uppercase mb-1">
                                    {area.title}
                                </h3>
                                <p className="text-xs font-mono text-secondary-text mb-3">
                                    {area.description}
                                </p>

                                {area.count !== null && (
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-bold text-accent font-mono">
                                            {area.count}
                                        </span>
                                        <span className="text-xs font-mono text-secondary-text uppercase">
                                            {area.count === 1 ? 'item' : 'items'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Card>
                    ))}
                </div>
            </div>

            {/* Quick Info */}
            <Card className="border-accent/10 bg-accent/5 p-4 border-dashed">
                <div className="flex items-center gap-4">
                    <div className="p-2 border-sharp border bg-accent/10 border-accent/30 text-accent">
                        <Layers size={20} />
                    </div>
                    <div>
                        <h4 className="text-xs font-mono font-bold text-primary-text uppercase tracking-widest">
                            Project Workspace
                        </h4>
                        <p className="text-xs font-mono text-secondary-text leading-tight mt-1">
                            Select a test module above to begin testing. All test data is scoped to this project.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default ProjectHub;
