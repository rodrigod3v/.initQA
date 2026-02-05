import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-deep overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isMobileSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-[60] lg:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileSidebarOpen(false)}
                />
            )}

            <Sidebar
                className={`
                    ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                    lg:translate-x-0 fixed lg:relative z-[70] h-full
                `}
                onCloseMobile={() => setIsMobileSidebarOpen(false)}
            />

            <main className="flex-1 flex flex-col min-w-0 w-full transition-all duration-300">
                <header className="h-10 border-b border-main bg-deep flex items-center justify-between px-4 lg:px-6 shrink-0 z-50">
                    <div className="flex items-center gap-4">
                        <button
                            className="lg:hidden p-1 -ml-1 text-accent hover:bg-accent/10 rounded-md"
                            onClick={() => setIsMobileSidebarOpen(true)}
                        >
                            <Menu size={20} />
                        </button>
                        <span className="text-[10px] font-mono text-emerald-500 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="hidden sm:inline">QA_ENGINE_READY</span>
                            <span className="sm:hidden">READY</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-mono text-secondary-text tracking-[0.2em] font-bold">
                            INIT.QA <span className="text-accent/50">V1.2.0</span>
                        </span>
                    </div>
                </header>
                <div className="flex-1 overflow-auto p-2 lg:p-6 custom-scrollbar">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
