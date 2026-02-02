import React from 'react';
import { Sidebar } from './Sidebar';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="flex h-screen bg-deep overflow-hidden">
            <Sidebar />

            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-12 border-b border-main bg-surface/30 flex items-center px-6 justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-mono text-secondary-text uppercase tracking-widest">System Status: <span className="text-accent ring-1 ring-accent/30 px-1 ml-1">Online</span></span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-mono text-secondary-text uppercase tracking-widest">Init.QA v1.0.0</span>
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
