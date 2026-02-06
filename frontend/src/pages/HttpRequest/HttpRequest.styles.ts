export const httpRequestStyles = {
    container: "h-full bg-deep flex flex-col overflow-hidden",
    header: "h-auto lg:h-16 border-b border-main/10 flex flex-col lg:flex-row items-start lg:items-center justify-between px-6 py-2 lg:py-0 bg-surface/30 shrink-0 gap-2 lg:gap-0",
    headerBrandContainer: "flex items-center gap-3 shrink-0 w-full lg:w-auto",
    headerIconWrapper: "p-2 bg-accent/10 border border-sharp border-accent/20 text-accent",
    headerTitle: "text-xs font-bold tracking-[0.2em] uppercase text-primary-text",
    headerVersion: "text-[8px] font-mono text-secondary-text uppercase tracking-widest opacity-50",
    headerActions: "flex-1 flex items-center justify-end gap-4 lg:ml-8 w-full lg:w-auto",

    main: "flex-1 flex flex-col lg:flex-row overflow-hidden gap-4 p-4",

    // Sidebar - Minimalist approach (no outer borders)
    sidebar: "w-full lg:w-[260px] bg-white/[0.02] flex flex-col shrink-0 overflow-hidden rounded-sm",
    sidebarHeader: "h-12 px-4 border-b border-white/[0.03] flex items-center justify-between bg-white/[0.02] shrink-0",
    sidebarLabel: "text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-accent/60",
    sidebarSettingsIcon: "text-secondary-text/30 hover:text-accent transition-colors cursor-pointer",
    sidebarContent: "flex-1 overflow-auto custom-scrollbar p-2 space-y-0.5",

    requestItem: (isSelected: boolean) => `w-full p-2.5 text-left transition-all group flex items-center gap-3 rounded-sm ${isSelected ? 'bg-accent/10 text-accent shadow-[inset_0_0_10px_rgba(16,185,129,0.05)]' : 'text-secondary-text hover:bg-white/[0.03] hover:text-primary-text'}`,
    requestItemContent: "flex items-center gap-2 flex-1 overflow-hidden",
    requestMethodBadge: (method: string) => `text-[8px] font-mono font-bold w-12 text-center py-0.5 border border-sharp border-white/5 uppercase ${method === 'GET' ? 'text-emerald-500/80' : method === 'POST' ? 'text-cyan-500/80' : 'text-amber-500/80'}`,
    requestName: "text-[11px] font-mono truncate uppercase tracking-tight flex-1",

    editorContainer: "flex-1 flex flex-col min-w-0 gap-4 overflow-hidden min-h-[400px] lg:min-h-0",

    // Controls
    methodSelect: "appearance-none bg-deep border border-main/10 px-4 font-mono font-bold text-accent text-[11px] focus:outline-none focus:border-accent/50 cursor-pointer h-9",
    urlInput: "flex-1 bg-deep border border-main/10 px-4 text-[11px] text-primary-text font-mono focus:border-accent/50 focus:outline-none placeholder:text-secondary-text/10 h-9",
    envSelect: "appearance-none bg-deep border border-main/10 px-4 font-mono font-bold text-accent text-[11px] focus:outline-none focus:border-accent/50 cursor-pointer h-9 px-8 pr-10",

    // Content areas
    editorBody: "flex-1 flex flex-col min-h-0 border border-main/10 bg-surface/30 overflow-hidden rounded-sm",
    editorPlaceholder: "h-full flex flex-col items-center justify-center opacity-5 uppercase font-mono tracking-[0.4em] text-[10px]",

    resultsPanel: "w-full lg:w-[420px] bg-surface/5 border border-main/10 flex flex-col shrink-0 overflow-hidden relative rounded-sm h-[400px] lg:h-auto",
    resultsHeader: "h-12 border-b border-main/10 bg-deep/50 flex items-center justify-between px-4 shrink-0",
    resultsTitle: "text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-accent flex items-center gap-2",
    resultsContent: "flex-1 overflow-hidden flex flex-col",

    executionOverlay: "absolute inset-0 bg-deep/80 backdrop-blur-md flex flex-col items-center justify-center z-50",

    latestExecutionStatus: (status: number) => `px-2 py-0.5 border border-main/10 text-[10px] font-mono font-bold uppercase ${status < 400 ? 'text-emerald-500 border-emerald-500/10 bg-emerald-500/5' : 'text-rose-500 border-rose-500/10 bg-rose-500/5'}`,
    
    // History
    historyContainer: "flex-1 overflow-auto custom-scrollbar p-2 space-y-1",
    historyItem: "w-full flex items-center justify-between p-2 hover:bg-white/[0.03] group transition-all rounded-sm",
    historyItemIndicator: (status: number) => `w-1.5 h-1.5 rounded-full ${status < 400 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'}`,
    historyItemStatus: "text-[10px] font-mono font-bold uppercase tracking-tight",
    historyItemDuration: "text-[9px] font-mono text-secondary-text/50 group-hover:text-accent transition-colors",

    // Tab System (Moving to shared Tabs component but keeping legacy for reference if needed)
    tabsContainer: "flex border-b border-main/10 bg-deep/30 shrink-0",
    tab: (isActive: boolean) => `px-4 h-10 flex items-center text-[10px] font-mono uppercase tracking-widest transition-all shrink-0 ${isActive ? 'bg-surface/50 text-accent border-b-2 border-accent' : 'text-secondary-text hover:text-primary-text hover:bg-surface/20'}`,
};

