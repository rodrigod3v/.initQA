import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Send, GitCompare, LogOut, Terminal, Layers, Monitor, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const navGroups = [
        {
            title: 'General',
            items: [
                { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
                { icon: Layers, label: 'Projects', path: '/projects' },
            ]
        },
        {
            title: 'API Testing',
            items: [
                { icon: Send, label: 'HTTP Requests', path: '/requests' },
                { icon: GitCompare, label: 'Comparator', path: '/comparison' },
            ]
        },
        {
            title: 'Web Testing',
            items: [
                { icon: Monitor, label: 'Web Scenarios', path: '/automation' },
            ]
        },
        {
            title: 'Performance',
            items: [
                { icon: Zap, label: 'K6 Ramp-Up', path: '/performance' },
            ]
        }
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className="w-16 lg:w-48 bg-surface border-r border-main flex flex-col h-screen sticky top-0 overflow-hidden">
            <div className="p-4 border-b border-main flex items-center gap-2 shrink-0">
                <Terminal className="text-accent w-6 h-6" />
                <span className="hidden lg:block font-bold text-sm tracking-tighter text-primary-text">
                    .init<span className="text-accent">QA</span>
                </span>
            </div>

            <nav className="flex-1 py-4 flex flex-col overflow-y-auto custom-scrollbar">
                {navGroups.map((group, groupIdx) => (
                    <div key={groupIdx} className="mb-4">
                        {group.title && (
                            <div className="hidden lg:block px-4 mb-2 text-[10px] font-mono uppercase text-secondary-text/60 tracking-widest font-bold">
                                {group.title}
                            </div>
                        )}
                        {group.items.map((item) => {
                            // Custom active logic and dynamic paths for project-scoped routes
                            const pathParts = location.pathname.split('/');
                            const currentProjectId = pathParts.includes('projects') ? pathParts[pathParts.indexOf('projects') + 1] : null;

                            const getDynamicPath = () => {
                                if (!currentProjectId) return item.path;
                                if (item.path === '/requests') return `/projects/${currentProjectId}/requests`;
                                if (item.path === '/automation') return `/projects/${currentProjectId}/web`;
                                if (item.path === '/performance') return `/projects/${currentProjectId}/load`;
                                return item.path;
                            };

                            const dynamicPath = getDynamicPath();

                            const isItemActive = () => {
                                const path = location.pathname;
                                if (dynamicPath === path) return true;
                                if (item.path === '/projects' && path.match(/^\/projects\/[^\/]+$/)) return true;
                                return false;
                            };

                            const isActive = isItemActive();

                            return (
                                <NavLink
                                    key={item.path}
                                    to={dynamicPath}
                                    className={`
                  flex items-center gap-3 px-4 py-2 transition-colors relative
                  ${isActive
                                            ? 'text-accent'
                                            : 'text-secondary-text hover:text-primary-text hover:bg-surface/50'}
                `}
                                >
                                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-accent rounded-r transition-all ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                                    <item.icon size={18} className="shrink-0" />
                                    <span className="hidden lg:block text-xs font-mono tracking-wide">{item.label}</span>
                                </NavLink>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <div className="p-2 border-t border-main">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2 text-secondary-text hover:text-danger hover:bg-danger/5 transition-colors rounded-sm"
                >
                    <LogOut size={20} />
                    <span className="hidden lg:block text-xs font-mono uppercase tracking-wider">Logout</span>
                </button>
            </div>
        </aside>
    );
};
