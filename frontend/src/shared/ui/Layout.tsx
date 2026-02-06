import React, { useState } from 'react';
import { Menu, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useRequestStore } from '@/stores/requestStore';
import { useScenarioStore } from '@/stores/scenarioStore';
import { useLoadTestStore } from '@/stores/loadTestStore';

const GlobalSyncIndicator: React.FC = () => {
    const requestSync = useRequestStore(state => state.syncStatus);
    const scenarioSync = useScenarioStore(state => state.syncStatus);
    const loadTestSync = useLoadTestStore(state => state.syncStatus);

    const statuses = [requestSync, scenarioSync, loadTestSync];

    let status: 'saving' | 'saved' | 'error' | 'idle' = 'idle';

    if (statuses.includes('error')) status = 'error';
    else if (statuses.includes('saving')) status = 'saving';
    else if (statuses.includes('saved')) status = 'saved';

    return (
        <div className="flex items-center gap-2 px-3 py-1 bg-main/5 border border-main/10 rounded-sm h-6 animate-in fade-in slide-in-from-top-1">
            {status === 'saving' ? (
                <>
                    <Loader2 size={10} className="animate-spin text-accent" />
                    <span className="text-[8px] font-mono text-accent uppercase tracking-widest">SAVING...</span>
                </>
            ) : status === 'saved' ? (
                <>
                    <CheckCircle2 size={10} className="text-emerald-500" />
                    <span className="text-[8px] font-mono text-emerald-500 uppercase tracking-widest">SYNCED</span>
                </>
            ) : status === 'error' ? (
                <>
                    <XCircle size={10} className="text-rose-500" />
                    <span className="text-[8px] font-mono text-rose-500 uppercase tracking-widest">SYNC_ERR</span>
                </>
            ) : (
                <>
                    <div className="w-1 h-1 rounded-full bg-main/20" />
                    <span className="text-[8px] font-mono text-secondary-text uppercase tracking-widest opacity-40">AUTO_SAVE_ON</span>
                </>
            )}
        </div>
    );
};

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
                            <span className="hidden xs:inline uppercase tracking-widest">Core_Engine_Ready</span>
                        </span>
                        <div className="h-4 w-px bg-main/20 hidden sm:block" />
                        <GlobalSyncIndicator />
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-mono text-secondary-text tracking-[0.2em] font-bold">
                            INIT.QA <span className="text-accent/50 hidden sm:inline">V1.2.0</span>
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
