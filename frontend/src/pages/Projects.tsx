import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Plus, Folder, ChevronRight, Loader2, Terminal, Calendar } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';

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
        <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-main pb-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tighter text-primary-text flex items-center gap-2">
                        <Terminal size={20} className="text-accent" />
                        PROJECT_WORKSPACE
                    </h1>
                    <p className="text-[10px] font-mono text-secondary-text uppercase tracking-widest mt-1">
                        Active Directories: {projects.length}
                    </p>
                </div>
                <Button
                    onClick={() => setIsModalOpen(true)}
                    glow
                    className="uppercase tracking-widest text-xs"
                >
                    <Plus size={16} className="mr-2" />
                    New_Project
                </Button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="animate-spin text-accent mb-4" size={32} />
                    <p className="text-xs font-mono text-secondary-text uppercase tracking-widest">Accessing Data...</p>
                </div>
            ) : projects.length === 0 ? (
                <Card className="border-dashed border-2 py-20 text-center">
                    <div className="w-16 h-16 bg-surface border-sharp border-main flex items-center justify-center mx-auto mb-6 text-secondary-text">
                        <Folder size={32} />
                    </div>
                    <h2 className="text-sm font-mono font-bold text-primary-text mb-2 uppercase tracking-widest">No Projects Found</h2>
                    <p className="text-[10px] font-mono text-secondary-text mb-8 max-w-xs mx-auto uppercase tracking-tighter">Initialize your workspace by creating your first technical project.</p>
                    <Button
                        variant="ghost"
                        onClick={() => setIsModalOpen(true)}
                        className="text-accent hover:text-accent/80 active:translate-y-0.5"
                    >
                        [ INITIALIZE_PROJECT ]
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {projects.map((project) => (
                        <Link
                            key={project.id}
                            to={`/projects/${project.id}/requests`}
                            className="group"
                        >
                            <Card className="p-0 border-main hover:border-accent/50 transition-colors relative h-full">
                                <div className="p-4 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="w-10 h-10 bg-deep border-sharp border-main text-accent flex items-center justify-center group-hover:glow-accent transition-all">
                                            <Folder size={20} />
                                        </div>
                                        <ChevronRight size={18} className="text-secondary-text group-hover:text-accent transition-colors" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-mono font-bold text-primary-text group-hover:text-accent transition-colors truncate uppercase tracking-tight">
                                            {project.name}
                                        </h3>
                                        <div className="flex items-center gap-1.5 mt-2 text-[9px] font-mono text-secondary-text uppercase tracking-tighter">
                                            <Calendar size={10} />
                                            <span>Registered: {new Date(project.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-1 w-0 bg-accent group-hover:w-full transition-all duration-300" />
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Create_New_Project"
            >
                <form onSubmit={handleCreateProject} className="space-y-6">
                    <Input
                        autoFocus
                        label="Project_Identifier"
                        placeholder="E.G. CORE_SYSTEM_API"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        required
                    />
                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="ghost"
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 text-xs uppercase tracking-widest"
                        >
                            Abort
                        </Button>
                        <Button
                            type="submit"
                            disabled={creating}
                            glow
                            className="flex-1 text-xs uppercase tracking-widest"
                        >
                            {creating ? 'Processing...' : 'Execute_Create'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Projects;
