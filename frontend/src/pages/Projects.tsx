import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Plus, Folder, ChevronRight, Loader2 } from 'lucide-react';

interface Project {
    id: string;
    name: string;
    createdAt: string;
}

const Projects: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await api.get('/projects');
            setProjects(response.data);
        } catch (err) {
            console.error('Failed to fetch projects');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;

        setCreating(true);
        try {
            const response = await api.post('/projects', { name: newProjectName });
            setProjects([...projects, response.data]);
            setNewProjectName('');
            setIsModalOpen(false);
        } catch (err) {
            console.error('Failed to create project');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Workspace</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">Manage your API collections</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/10"
                >
                    <Plus size={20} />
                    New Project
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
                    <p className="text-slate-500">Loading your workspace...</p>
                </div>
            ) : projects.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                        <Folder size={40} />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No projects yet</h2>
                    <p className="text-slate-500 mb-8 max-w-sm mx-auto">Create your first project to start organizing your API tests.</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="text-indigo-600 font-semibold"
                    >
                        Create first project
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                        <Link
                            key={project.id}
                            to={`/projects/${project.id}/requests`}
                            className="group bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 transform translate-x-4 translate-y-[-4px] group-hover:translate-x-0 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all text-indigo-500">
                                <ChevronRight size={24} />
                            </div>
                            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                <Folder size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{project.name}</h3>
                            <p className="text-sm text-slate-500">Created {new Date(project.createdAt).toLocaleDateString()}</p>
                        </Link>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Create New Project</h2>
                        <form onSubmit={handleCreateProject} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Project Name
                                </label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    className="block w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    placeholder="e.g. Finance API, CRM Integration"
                                    required
                                />
                            </div>
                            <div className="flex gap-4 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {creating ? <Loader2 className="animate-spin" size={20} /> : 'Create Project'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Projects;
