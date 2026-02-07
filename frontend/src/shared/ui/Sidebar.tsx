import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Send, GitCompare, LogOut, Terminal, Layers, Monitor, Zap, Home, ChevronLeft, ChevronRight, Lock, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProjectStore } from '@/stores/projectStore';

interface NavItem {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    path: string;
    external?: boolean;
    requiresProject?: boolean;
}

interface NavGroup {
    title: string;
    items: NavItem[];
}

interface SidebarProps {
    className?: string;
    onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '', onCloseMobile }) => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    // Optimized Store Subscriptions
    const selectedProject = useProjectStore(state => state.selectedProject);

    const pathParts = location.pathname.split('/');
    const currentProjectId = pathParts.includes('projects') ? pathParts[pathParts.indexOf('projects') + 1] : null;

    // Use URL projectId if available, otherwise fallback to store
    const activeProjectId = currentProjectId || selectedProject?.id;

    // Close mobile sidebar on navigation
    React.useEffect(() => {
        if (onCloseMobile) onCloseMobile();
    }, [location.pathname, onCloseMobile]);

    const navGroups: NavGroup[] = [
        {
            title: 'General',
            items: [
                { icon: Home, label: 'Home', path: '/' },
                { icon: Layers, label: 'Projects', path: '/projects' },
                { icon: BarChart3, label: 'Executive', path: '/executive', requiresProject: true },
            ]
        },
        {
            title: 'API Testing',
            items: [
                { icon: Send, label: 'HTTP Requests', path: '/requests', requiresProject: true },
                { icon: GitCompare, label: 'Comparator', path: '/comparison', requiresProject: true },
            ]
        },
        {
            title: 'Automation',
            items: [
                { icon: Monitor, label: 'Web Scenarios', path: '/automation', requiresProject: true },
                { icon: Zap, label: 'Load Tests', path: '/performance', requiresProject: true },
            ]
        },
        {
            title: 'Developer',
            items: [
                { icon: Terminal, label: 'API Docs', path: 'http://localhost:3000/api/docs', external: true },
            ]
        }
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getDynamicPath = (item: NavItem) => {
        if (!activeProjectId) return item.path;
        if (item.path === '/requests') return `/projects/${activeProjectId}/requests`;
        if (item.path === '/executive') return `/projects/${activeProjectId}/executive`;
        if (item.path === '/automation') return `/projects/${activeProjectId}/web`;
        if (item.path === '/performance') return `/projects/${activeProjectId}/load`;
        // Comparator might not be strictly project-scoped in terms of URL, but let's keep it simple
        return item.path;
    };

    return (
        <aside
            className={`
                ${isCollapsed ? 'w-16' : 'w-64 md:w-56 lg:w-48'} 
                bg-surface border-r border-main flex flex-col h-screen lg:sticky top-0 
                overflow-visible shadow-2xl transition-all duration-300 ease-in-out
                ${className}
            `}
        >
            {/* Collapse Toggle - Floating on border */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex absolute -right-3 top-12 w-6 h-6 bg-surface border border-main rounded-full items-center justify-center text-secondary-text hover:text-accent hover:border-accent transition-all z-[60] shadow-lg group"
            >
                {isCollapsed ? <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" /> : <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />}
            </button>

            <div className={`p-4 border-b border-main/50 flex items-center shrink-0 bg-gradient-to-b from-white/[0.01] to-transparent h-16 ${isCollapsed ? 'justify-center px-0' : ''}`}>
                <div className="flex items-center gap-3">
                    {!isCollapsed && (
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20 shrink-0 shadow-inner">
                            <Terminal className="text-accent w-4 h-4" />
                        </div>
                    )}
                    <span className={`
                        font-bold tracking-tighter text-primary-text uppercase bg-clip-text
                        ${isCollapsed ? 'text-[10px] block' : 'text-sm hidden md:block'}
                    `}>
                        .init<span className="text-accent">QA</span>
                    </span>
                </div>
            </div>

            <nav className="flex-1 py-6 flex flex-col overflow-y-auto custom-scrollbar gap-1">
                {navGroups.map((group, groupIdx) => (
                    <div key={groupIdx} className="mb-6">
                        {group.title && !isCollapsed && (
                            <div className="hidden lg:block px-6 mb-3 text-[9px] font-mono uppercase text-secondary-text/30 tracking-[0.25em] font-bold">
                                {group.title}
                            </div>
                        )}
                        {group.items.map((item) => {
                            if (item.external) {
                                return (
                                    <a
                                        key={item.label}
                                        href={item.path}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`
                                            flex items-center gap-3 px-4 py-2.5 text-secondary-text 
                                            hover:text-accent hover:bg-accent/5 transition-all group mx-3 rounded-lg
                                            ${isCollapsed ? 'justify-center mx-1 px-0' : ''}
                                        `}
                                        title={isCollapsed ? item.label : ''}
                                    >
                                        <item.icon size={18} className="shrink-0 transition-transform group-hover:scale-110" />
                                        {!isCollapsed && <span className="hidden md:block text-xs font-mono tracking-wide">{item.label}</span>}
                                    </a>
                                );
                            }

                            const dynamicPath = getDynamicPath(item);
                            const isActive = location.pathname === dynamicPath;
                            const isDisabled = item.requiresProject && !activeProjectId;

                            return (
                                <NavLink
                                    key={item.path}
                                    to={isDisabled ? '#' : dynamicPath}
                                    onClick={(e: React.MouseEvent) => isDisabled && e.preventDefault()}
                                    className={`
                                        flex items-center gap-3 px-4 py-2.5 transition-all relative mx-3 rounded-lg group
                                        ${isActive
                                            ? 'text-accent bg-accent/10 border border-accent/20 shadow-[0_0_15px_rgba(var(--accent-rgb),0.05)]'
                                            : isDisabled
                                                ? 'text-secondary-text/20 cursor-not-allowed'
                                                : 'text-secondary-text hover:text-primary-text hover:bg-white/[0.02]'}
                                        ${isCollapsed ? 'justify-center mx-1 px-0' : ''}
                                    `}
                                    title={isDisabled ? `Open a project to access ${item.label}` : (isCollapsed ? item.label : '')}
                                >
                                    {isActive && !isCollapsed && (
                                        <div className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-1 h-5 bg-accent rounded-r shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]" />
                                    )}
                                    <div className="relative">
                                        <item.icon size={18} className={`shrink-0 transition-transform ${isActive ? 'scale-110' : !isDisabled ? 'group-hover:scale-110' : ''}`} />
                                        {isDisabled && (
                                            <div className="absolute -top-1 -right-1 bg-surface rounded-full p-0.5 border border-main">
                                                <Lock size={8} className="text-secondary-text/40" />
                                            </div>
                                        )}
                                    </div>
                                    {!isCollapsed && <span className="hidden md:block text-xs font-mono tracking-wide">{item.label}</span>}
                                </NavLink>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <div className={`p-4 border-t border-main/50 bg-white/[0.01] ${isCollapsed ? 'flex justify-center p-2' : ''}`}>
                <button
                    onClick={handleLogout}
                    className={`
                        flex items-center gap-3 px-3 py-2 text-secondary-text/60 hover:text-rose-500 
                        hover:bg-rose-500/10 transition-all rounded-lg group w-full
                        ${isCollapsed ? 'justify-center' : 'lg:justify-start'}
                    `}
                    title={isCollapsed ? 'Logout' : ''}
                >
                    <LogOut size={16} className="transition-transform group-hover:-translate-x-1" />
                    {!isCollapsed && <span className="hidden md:block text-[10px] font-mono uppercase tracking-[0.1em]">Session Stop</span>}
                </button>
            </div>
        </aside>
    );
};
