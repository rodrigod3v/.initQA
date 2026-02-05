export const httpRequestStyles = {
    container: "h-full bg-deep flex flex-col overflow-hidden",
    header: "h-12 border-b border-main flex items-center justify-between px-4 bg-surface/30 shrink-0",
    headerBrandContainer: "flex items-center gap-3",
    headerIconWrapper: "p-1.5 bg-accent/10 border border-sharp border-accent/20 text-accent",
    headerTitle: "text-xs font-bold tracking-tighter uppercase",
    headerVersion: "text-[8px] font-mono text-secondary-text uppercase tracking-widest",
    headerActions: "flex items-center gap-2",

    main: "flex-1 flex overflow-hidden gap-x-2 p-2",

    // Three-Column Layout Proportions
    sidebar: "w-[240px] border border-main bg-surface/10 flex flex-col shrink-0 overflow-hidden",
    sidebarHeader: "h-10 px-3 border-b border-main flex items-center justify-between bg-deep/50 shrink-0",
    sidebarLabel: "text-[11px] font-mono font-bold uppercase tracking-widest text-accent",
    sidebarSettingsIcon: "opacity-30 hover:opacity-100 transition-opacity cursor-pointer",
    sidebarContent: "flex-1 overflow-auto custom-scrollbar p-1 space-y-0.5",

    requestItem: (isSelected: boolean) => `w-full p-2 text-left border border-sharp transition-all group flex items-center gap-2 ${isSelected ? 'bg-accent/10 border-accent/30 text-accent' : 'border-transparent text-secondary-text hover:bg-surface/30 hover:text-primary-text'}`,
    requestItemContent: "flex items-center gap-2 flex-1 overflow-hidden",
    requestMethodBadge: (method: string) => `text-[8px] font-mono font-bold w-10 text-center py-0.5 border border-sharp uppercase ${method === 'GET' ? 'text-emerald-500 border-emerald-500/30' : method === 'POST' ? 'text-cyan-500 border-cyan-500/30' : 'text-amber-500 border-amber-500/30'}`,
    requestName: "text-[11px] font-mono truncate uppercase tracking-tight flex-1",

    editorContainer: "flex-1 flex flex-col min-w-0 gap-2 overflow-hidden",

    // Top Bar (Method + URL + Env)
    editorTopBar: "p-1.5 border border-main bg-surface/30 shrink-0 flex gap-1.5 items-stretch h-11",
    methodSelect: "appearance-none bg-deep border border-sharp border-main px-3 font-mono font-bold text-accent text-[11px] focus:outline-none focus:border-accent/50 cursor-pointer h-full",
    urlInput: "flex-1 bg-deep border border-sharp border-main px-3 text-[11px] text-primary-text font-mono focus:border-accent/50 focus:outline-none placeholder:text-secondary-text/30 h-full",

    envSelectorContainer: "flex bg-deep border border-sharp border-accent/30 shrink-0 h-full",
    envSelect: "appearance-none bg-transparent h-full px-3 font-mono font-bold text-accent text-[11px] focus:outline-none cursor-pointer pr-7",

    // Core areas
    editorBody: "flex-1 flex flex-col min-h-0 border border-main bg-surface/30 overflow-hidden",
    editorHeader: "h-9 bg-deep/50 flex items-center justify-between border-b border-main px-3 shrink-0",
    editorHeaderTitle: "flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest font-bold text-accent",
    editorPlaceholder: "h-full flex flex-col items-center justify-center opacity-20 uppercase font-mono tracking-[0.2em] text-xs",

    resultsPanel: "w-[400px] bg-surface/5 border border-main flex flex-col shrink-0 overflow-hidden relative",
    resultsHeader: "h-11 border-b border-main bg-deep/50 flex items-center justify-between px-4 shrink-0",
    resultsTitle: "text-[11px] font-mono font-bold uppercase tracking-widest text-accent flex items-center gap-2",
    resultsContent: "flex-1 overflow-hidden flex flex-col",

    executionOverlay: "absolute inset-0 bg-deep/80 backdrop-blur-sm flex flex-col items-center justify-center z-50",

    latestExecutionCard: "p-2 border-b border-main bg-accent/5 flex items-center justify-between shrink-0",
    latestExecutionStatus: (status: number) => `px-2 py-0.5 border border-sharp text-[10px] font-mono font-bold uppercase ${status < 400 ? 'text-emerald-500 border-emerald-500/30' : 'text-rose-500 border-rose-500/30'}`,
    latestExecutionMeta: "text-[10px] font-mono text-secondary-text",

    historyContainer: "flex-1 overflow-auto custom-scrollbar p-1.5 space-y-0.5",
    historyItem: "w-full flex items-center justify-between p-1.5 border border-sharp border-main/30 hover:bg-surface/50 group transition-all",
    historyItemMain: "flex items-center gap-3",
    historyItemIndicator: (status: number) => `w-1.5 h-1.5 border border-sharp ${status < 400 ? 'bg-emerald-500 border-emerald-500/30' : 'bg-rose-500 border-rose-500/30'}`,
    historyItemStatus: "text-[10px] font-mono font-bold uppercase tracking-tight",
    historyItemTime: "text-[9px] font-mono text-secondary-text uppercase opacity-50",
    historyItemDuration: "text-[9px] font-mono text-accent opacity-50 group-hover:opacity-100 transition-opacity",

    // Tabs
    tabsContainer: "flex border-b border-main bg-deep/30 shrink-0 overflow-x-auto custom-scrollbar-hide",
    tab: (isActive: boolean) => `px-2 h-9 flex items-center text-[10px] font-mono uppercase tracking-wider transition-all border-r border-main shrink-0 ${isActive ? 'bg-accent/10 text-accent border-b-2 border-b-accent' : 'text-secondary-text hover:text-primary-text hover:bg-white/5'}`,
};
