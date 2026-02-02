import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Send, GitCompare, LogOut, Terminal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const navItems = [
        { icon: LayoutDashboard, label: 'Projects', path: '/projects' },
        { icon: Send, label: 'Requests', path: '/requests' },
        { icon: GitCompare, label: 'Comparator', path: '/comparison' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className="w-16 lg:w-48 bg-surface border-r border-main flex flex-col h-screen sticky top-0">
            <div className="p-4 border-b border-main flex items-center gap-2">
                <Terminal className="text-accent w-6 h-6" />
                <span className="hidden lg:block font-bold text-sm tracking-tighter text-primary-text">
                    .init<span className="text-accent">QA</span>
                </span>
            </div>

            <nav className="flex-1 py-4 flex flex-col items-center lg:items-stretch">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }: { isActive: boolean }) => `
              flex items-center gap-3 px-4 py-3 transition-colors
              ${isActive
                                ? 'bg-accent/5 text-accent border-r-2 border-accent'
                                : 'text-secondary-text hover:text-primary-text hover:bg-surface/50'}
            `}
                    >
                        <item.icon size={20} />
                        <span className="hidden lg:block text-xs font-mono uppercase tracking-wider">{item.label}</span>
                    </NavLink>
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
