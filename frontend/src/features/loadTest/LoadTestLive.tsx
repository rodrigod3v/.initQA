import React, { useEffect, useState, useRef } from 'react';
import { socketService } from '@/services/socket.service';
import { Card } from '@/shared/ui/Card';
import { Zap, Users, Activity, Clock } from 'lucide-react';

interface LoadTestLiveProps {
    testId: string;
    onFinish: () => void;
}

interface Metrics {
    vus: number;
    iterations: number;
    timestamp: number;
}

const LoadTestLive: React.FC<LoadTestLiveProps> = ({ testId, onFinish }) => {
    const [metrics, setMetrics] = useState<Metrics[]>([]);
    const [currentVus, setCurrentVus] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const startTimeRef = useRef(Date.now());

    useEffect(() => {
        if (!testId) return;

        const handleMetrics = (data: Metrics) => {
            setMetrics(prev => [...prev.slice(-30), data]); // Keep last 30 points
            setCurrentVus(data.vus);
        };

        socketService.onLoadMetrics(testId, handleMetrics);

        // Timer for elapsed time
        const timer = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 1000);

        return () => {
            socketService.offLoadMetrics(testId);
            clearInterval(timer);
        };
    }, [testId]);

    // Simple textual dashboard for now, can be charts later
    return (
        <div className="flex flex-col h-full bg-deep/90 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-accent/5 via-deep to-deep pointer-events-none" />

            <div className="z-10 flex flex-col items-center justify-center h-full gap-8 p-8">
                <div className="text-center animate-pulse">
                    <h2 className="text-xl font-mono font-bold text-accent uppercase tracking-[0.3em] mb-2 flex items-center justify-center gap-3">
                        <Zap className="animate-bounce" /> LIVE_EXECUTION_STREAM
                    </h2>
                    <p className="text-xs font-mono text-secondary-text uppercase">Receiving Telemetry from K6 Engine...</p>
                </div>

                <div className="grid grid-cols-3 gap-6 w-full max-w-4xl">
                    <Card className="p-6 bg-surface/40 border-accent/20 flex flex-col items-center justify-center aspect-video relative overflow-hidden group">
                        <div className="absolute inset-0 bg-accent/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                        <Users size={32} className="text-accent mb-2" />
                        <span className="text-[10px] font-mono text-secondary-text uppercase tracking-widest mb-1">Active Users (VUs)</span>
                        <span className="text-4xl font-mono font-bold text-white transition-all scale-100 group-hover:scale-110">{currentVus}</span>
                    </Card>

                    <Card className="p-6 bg-surface/40 border-accent/20 flex flex-col items-center justify-center aspect-video relative overflow-hidden group">
                        <div className="absolute inset-0 bg-emerald-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                        <Activity size={32} className="text-emerald-500 mb-2" />
                        <span className="text-[10px] font-mono text-secondary-text uppercase tracking-widest mb-1">Iterations</span>
                        <span className="text-4xl font-mono font-bold text-white transition-all scale-100 group-hover:scale-110">
                            {metrics.length > 0 ? metrics[metrics.length - 1].iterations : 0}
                        </span>
                    </Card>

                    <Card className="p-6 bg-surface/40 border-accent/20 flex flex-col items-center justify-center aspect-video relative overflow-hidden group">
                        <div className="absolute inset-0 bg-blue-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                        <Clock size={32} className="text-blue-500 mb-2" />
                        <span className="text-[10px] font-mono text-secondary-text uppercase tracking-widest mb-1">Elapsed Time</span>
                        <span className="text-4xl font-mono font-bold text-white transition-all scale-100 group-hover:scale-110">{elapsed}s</span>
                    </Card>
                </div>

                {/* Mini Chart (Visual Bar) */}
                <div className="w-full max-w-4xl h-16 bg-surface/20 border border-main rounded flex items-end gap-1 p-1">
                    {metrics.map((m, i) => (
                        <div
                            key={i}
                            className="flex-1 bg-accent/80 hover:bg-accent transition-all rounded-t-sm min-h-[4px]"
                            style={{ height: `${Math.min((m.vus / 50) * 100, 100)}%` }} // Assume max 50 VUs for scale
                            title={`VUs: ${m.vus}`}
                        />
                    ))}
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={onFinish} // Manually allow exit if stuck
                        className="px-6 py-2 border border-white/10 text-xs font-mono text-secondary-text uppercase hover:bg-white/5 hover:text-white transition-colors"
                    >
                        Force_Stop_Monitoring
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoadTestLive;
