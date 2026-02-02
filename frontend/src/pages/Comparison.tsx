import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { GitCompare, Loader2, ArrowRight, AlertCircle } from 'lucide-react';

interface Project {
    id: string;
    name: string;
}

interface Environment {
    id: string;
    name: string;
}

interface Request {
    id: string;
    url: string;
}

const Comparison: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [envLeft, setEnvLeft] = useState('');
    const [envRight, setEnvRight] = useState('');
    const [requests, setRequests] = useState<Request[]>([]);
    const [selectedRequest, setSelectedRequest] = useState('');

    const [loading, setLoading] = useState(true);
    const [comparing, setComparing] = useState(false);
    const [diff, setDiff] = useState<any>(null);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await api.get('/projects');
            setProjects(response.data);
        } finally {
            setLoading(false);
        }
    };

    const handleProjectChange = async (id: string) => {
        setSelectedProject(id);
        setRequests([]);
        setEnvironments([]);
        if (!id) return;

        try {
            const [reqs, envs] = await Promise.all([
                api.get(`/requests?projectId=${id}`),
                api.get(`/projects/${id}/environments`)
            ]);
            setRequests(reqs.data);
            setEnvironments(envs.data);
        } catch (err) {
            console.error('Failed to load project details');
        }
    };

    const handleCompare = async () => {
        if (!selectedRequest || !envLeft || !envRight) return;
        setComparing(true);
        setDiff(null);
        try {
            const response = await api.get(`/requests/compare`, {
                params: {
                    requestId: selectedRequest,
                    leftEnvId: envLeft,
                    rightEnvId: envRight,
                }
            });
            setDiff(response.data.delta || { message: 'No differences found' });
        } catch (err) {
            console.error('Comparison failed');
        } finally {
            setComparing(false);
        }
    };

    if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-10">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Response Comparison</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">Compare API responses between different environments</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Select Project</label>
                        <select
                            value={selectedProject}
                            onChange={(e) => handleProjectChange(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Choose a project...</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Select Request</label>
                        <select
                            value={selectedRequest}
                            onChange={(e) => setSelectedRequest(e.target.value)}
                            disabled={!selectedProject}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            <option value="">Choose a request...</option>
                            {requests.map(r => <option key={r.id} value={r.id}>{r.url}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl">
                    <div className="flex-1 space-y-2 w-full">
                        <label className="text-xs font-bold text-slate-400 uppercase">Environment A</label>
                        <select
                            value={envLeft}
                            onChange={(e) => setEnvLeft(e.target.value)}
                            disabled={!selectedProject}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Select env...</option>
                            {environments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-full">
                        <ArrowRight size={20} />
                    </div>
                    <div className="flex-1 space-y-2 w-full">
                        <label className="text-xs font-bold text-slate-400 uppercase">Environment B</label>
                        <select
                            value={envRight}
                            onChange={(e) => setEnvRight(e.target.value)}
                            disabled={!selectedProject}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Select env...</option>
                            {environments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                </div>

                <button
                    onClick={handleCompare}
                    disabled={comparing || !selectedRequest || !envLeft || !envRight}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-600/20"
                >
                    {comparing ? <Loader2 className="animate-spin" size={20} /> : <GitCompare size={20} />}
                    Analyze Differences
                </button>

                {diff && (
                    <div className="mt-10 animate-in fade-in slide-in-from-top-4 duration-500">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <AlertCircle size={20} className="text-indigo-500" />
                            Diff Analysis
                        </h3>
                        <div className="bg-slate-950 rounded-2xl p-6 font-mono text-xs text-indigo-400 overflow-auto max-h-96">
                            <pre>{JSON.stringify(diff, null, 2)}</pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Comparison;
