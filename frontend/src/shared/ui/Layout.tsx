import React from 'react';
import { Sidebar } from './Sidebar';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="flex h-screen bg-deep overflow-hidden">
            <Sidebar />

            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-10 border-b border-main bg-deep flex items-center justify-between px-6 shrink-0 z-50">
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-mono text-emerald-500 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            QA_ENGINE_READY
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-mono text-secondary-text tracking-[0.2em] font-bold">
                            INIT.QA <span className="text-accent/50">V1.2.0</span>
                        </span>
                    </div>
                </header>
                <div className="flex-1 overflow-auto p-4 lg:p-6 custom-scrollbar">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
