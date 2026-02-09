import React, { useMemo } from 'react';
import { type ExecutionResult } from '@/shared/types/api';
import { type Step } from '@/stores/scenarioStore';
import { Clock, Sparkles } from 'lucide-react';

interface ScenarioHeatmapProps {
    history: ExecutionResult[];
    steps: Step[];
}

const ScenarioHeatmap: React.FC<ScenarioHeatmapProps> = ({ history, steps }) => {
    // 1. Process Data: Map executions to a grid format
    // X-Axis: Execution IDs (Time desc)
    // Y-Axis: Step Indices

    const processedData = useMemo(() => {
        return history.slice(0, 50).map(exec => {
            const stepLogs = exec.logs || [];
            // Map logs to steps by index if possible, or fuzzy match
            // For simplicity in this version, we'll try to match by step index in the logs if available,
            // or just map sequentially if logs are sequential.
            // A more robust approach would be to log step IDs.
            // Here, we assume logs are in order.

            return {
                id: exec.id,
                date: new Date(exec.createdAt),
                status: exec.status,
                duration: exec.duration,
                steps: stepLogs.map(log => ({
                    status: log.status,
                    duration: log.duration || 0,
                    error: log.error,
                    stepName: log.step
                }))
            };
        });
    }, [history]);

    const getDurationColor = (duration: number, status?: string) => {
        if (status === 'FAILED') return 'bg-rose-500/80';
        if (status === 'HEALED') return 'bg-amber-500/80';
        if (duration < 500) return 'bg-emerald-500/80'; // Fast
        if (duration < 2000) return 'bg-yellow-500/80'; // Medium
        return 'bg-orange-500/80'; // Slow
    };

    if (history.length === 0) return (
        <div className="flex flex-col items-center justify-center p-8 text-secondary-text opacity-50">
            <Clock size={48} className="mb-4" />
            <span className="text-xs font-mono uppercase">NO_HISTORY_DATA</span>
        </div>
    );

    return (
        <div className="flex flex-col h-full overflow-hidden bg-deep/20 p-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-mono font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> PERFORMANCE_DELTA_REPORT
                </h3>
                <div className="flex gap-4 text-[9px] font-mono text-secondary-text">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500/80 rounded" /> &lt;500ms</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-500/80 rounded" /> &lt;2s</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-orange-500/80 rounded" /> &gt;2s</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-rose-500/80 rounded" /> FAIL</div>
                </div>
            </div>

            {/* Heatmap Container */}
            <div className="flex-1 overflow-auto custom-scrollbar border border-main bg-deep">
                <div className="flex min-w-max">
                    {/* Y-Axis: Steps */}
                    <div className="sticky left-0 z-10 bg-deep border-r border-main flex flex-col min-w-[200px]">
                        <div className="h-10 border-b border-main flex items-center px-2 bg-surface/50">
                            <span className="text-[10px] font-mono font-bold">EXECUTION_ID</span>
                        </div>
                        {steps.map((step, idx) => (
                            <div key={idx} className="h-8 flex items-center px-2 border-b border-main/30 text-[9px] font-mono text-secondary-text truncate" title={step.value || step.selector}>
                                <span className="font-bold mr-2 text-accent">{idx + 1}.</span> {step.type}
                            </div>
                        ))}
                        {/* Total Duration Row */}
                        <div className="h-8 flex items-center px-2 border-t border-main bg-surface/20 text-[9px] font-mono font-bold text-accent">
                            TOTAL_DURATION
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="flex">
                        {processedData.map((exec, execIdx) => (
                            <div key={exec.id} className="flex flex-col border-r border-main/30 min-w-[60px]">
                                {/* X-Axis Header */}
                                <div className="h-10 border-b border-main flex flex-col justify-center items-center px-1 bg-surface/30 cursor-pointer hover:bg-surface/50 transition-colors" title={exec.date.toLocaleString()}>
                                    <span className={`text-[9px] font-bold ${exec.status === 'SUCCESS' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        #{processedData.length - execIdx}
                                    </span>
                                    <span className="text-[8px] opacity-50">{exec.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>

                                {/* Cells */}
                                {steps.map((_, stepIdx) => {
                                    const log = exec.steps[stepIdx];
                                    if (!log) return (
                                        <div key={stepIdx} className="h-8 bg-deep/50 border-b border-main/30" />
                                    );

                                    return (
                                        <div
                                            key={stepIdx}
                                            className={`h-8 border-b border-main/30 flex items-center justify-center text-[8px] font-mono text-white/90 cursor-help transition-all hover:brightness-125 relative group ${getDurationColor(log.duration, log.status)}`}
                                        >
                                            {log.status === 'HEALED' && <Sparkles size={8} className="absolute top-0.5 right-0.5 text-white animate-pulse" />}
                                            {log.duration}

                                            {/* Tooltip */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50 bg-deep border border-main p-2 rounded shadow-xl min-w-[120px] pointer-events-none">
                                                <div className="text-[9px] font-bold mb-1">{log.stepName}</div>
                                                <div className="flex justify-between text-[8px] text-secondary-text">
                                                    <span>Duration:</span>
                                                    <span className="text-white">{log.duration}ms</span>
                                                </div>
                                                <div className="flex justify-between text-[8px] text-secondary-text">
                                                    <span>Status:</span>
                                                    <span className={log.status === 'FAILED' ? 'text-rose-500' : 'text-emerald-500'}>{log.status || 'OK'}</span>
                                                </div>
                                                {log.error && (
                                                    <div className="text-[8px] text-rose-500 mt-1 border-t border-main/50 pt-1">
                                                        {log.error}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Total Footer */}
                                <div className="h-8 border-t border-main bg-surface/10 flex items-center justify-center text-[9px] font-mono text-accent/80">
                                    {exec.duration}ms
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScenarioHeatmap;
