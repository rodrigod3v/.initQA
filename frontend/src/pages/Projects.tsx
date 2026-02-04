import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// import api from '../services/api'; // Removed direct api access
import { useProjectStore } from '../stores/projectStore';
import { Plus, Folder, ChevronRight, Loader2, Terminal, Calendar, Trash2, Save } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';


const Projects: React.FC = () => {
    // Store Hooks
    const { projects, isLoading: loading, fetchProjects, createProject, deleteProject } = useProjectStore(state => state);

    // Local UI state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [creating, setCreating] = useState(false);

    // Confirmation Modal State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<{ id: string, name: string } | null>(null);

    useEffect(() => {
        fetchProjects();
    }, []);

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;

        setCreating(true);
        try {
            await createProject(newProjectName);
            setNewProjectName('');
            setIsModalOpen(false);
        } catch (err) {
            console.error('Failed to create project');
        } finally {
            setCreating(false);
        }
    };

    const confirmDelete = async () => {
        if (!projectToDelete) return;
        try {
            await deleteProject(projectToDelete.id);
            setProjectToDelete(null); // Close modal automatically via state cleanup logic if needed, or manual close
            setIsConfirmOpen(false);
        } catch (err) {
            console.error('Failed to delete project');
        }
    };

    const handleDeleteProject = (id: string, name: string) => {
        setProjectToDelete({ id, name });
        setIsConfirmOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-main pb-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tighter text-primary-text flex items-center gap-2">
                        <Terminal size={20} className="text-accent" />
                        MY_PROJECTS
                    </h1>
                    <p className="text-[10px] font-mono text-secondary-text uppercase tracking-widest mt-1">
                        Total Projects: {projects.length}
                    </p>
                </div>
                <Button
                    onClick={() => setIsModalOpen(true)}
                    glow
                    className="uppercase tracking-widest text-xs"
                    title="Start New Project"
                >
                    <Plus size={16} className="mr-2" />
                    Create_Project
                </Button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="animate-spin text-accent mb-4" size={32} />
                    <p className="text-xs font-mono text-secondary-text uppercase tracking-widest">Loading Projects...</p>
                </div>
            ) : projects.length === 0 ? (
                <Card className="border-dashed border-2 py-20 text-center">
                    <div className="w-16 h-16 bg-surface border-sharp border-main flex items-center justify-center mx-auto mb-6 text-secondary-text">
                        <Folder size={32} />
                    </div>
                    <h2 className="text-sm font-mono font-bold text-primary-text mb-2 uppercase tracking-widest">No Projects Found</h2>
                    <p className="text-[10px] font-mono text-secondary-text mb-8 max-w-xs mx-auto uppercase tracking-tighter">Get started by creating your first QA project to manage your API tests.</p>
                    <Button
                        variant="ghost"
                        onClick={() => setIsModalOpen(true)}
                        className="text-accent hover:text-accent/80 active:translate-y-0.5"
                        title="Create New Project"
                    >
                        [ CREATE_FIRST_PROJECT ]
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {projects.map((project) => (
                        <Link
                            key={project.id}
                            to={`/projects/${project.id}`}
                            className="group"
                        >
                            <Card className="p-0 border-main hover:border-accent/50 transition-all relative h-full group/card overflow-visible">
                                <div className="p-4 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="w-10 h-10 bg-deep border-sharp border-main text-accent flex items-center justify-center group-hover:glow-accent transition-all">
                                            <Folder size={20} />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleDeleteProject(project.id, project.name);
                                                }}
                                                className="p-1.5 text-secondary-text hover:text-danger hover:bg-danger/10 border-sharp border border-transparent hover:border-danger/30 transition-all opacity-0 group-hover/card:opacity-100"
                                                title="Delete Project"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                            <ChevronRight size={18} className="text-secondary-text group-hover:text-accent transition-colors" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-mono font-bold text-primary-text group-hover:text-accent transition-colors truncate uppercase tracking-tight">
                                            {project.name}
                                        </h3>
                                        <div className="flex items-center gap-1.5 mt-2 text-[9px] font-mono text-secondary-text uppercase tracking-tighter">
                                            <Calendar size={10} />
                                            <span>Created At: {new Date(project.createdAt).toLocaleDateString()}</span>
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
                        label="Project Name"
                        placeholder="E.G. USER_SERVICE_API"
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
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={creating}
                            glow
                            className="flex-1 text-xs uppercase tracking-widest gap-2"
                        >
                            <Save size={14} />
                            {creating ? 'Creating...' : 'Create_Project'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmDelete}
                title="DELETE_PROJECT_CONFIRMATION"
                message={`Permanently delete project "${projectToDelete?.name}" and all its associated data (environments, requests, history)? This action cannot be undone.`}
                confirmText="DELETE_PROJECT"
            />
        </div>
    );
};

export default Projects;
