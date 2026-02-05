import React from 'react';
import { Play, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';

interface RunTestButtonProps {
    onRun: () => void;
    isLoading: boolean;
    disabled?: boolean;
}

export const RunTestButton: React.FC<RunTestButtonProps> = ({ onRun, isLoading, disabled }) => {
    return (
        <Button
            onClick={onRun}
            disabled={isLoading || disabled}
            glow
            className="uppercase tracking-widest text-[10px] h-8 px-4"
        >
            {isLoading ? (
                <Loader2 size={12} className="animate-spin mr-2" />
            ) : (
                <Play size={12} className="mr-2" />
            )}
            {isLoading ? 'Executing...' : 'Run_Test'}
        </Button>
    );
};
