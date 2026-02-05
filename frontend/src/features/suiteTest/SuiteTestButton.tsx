import React from 'react';
import { Layers, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';

interface SuiteTestButtonProps {
    onRun: () => void;
    isLoading: boolean;
    disabled?: boolean;
}

export const SuiteTestButton: React.FC<SuiteTestButtonProps> = ({ onRun, isLoading, disabled }) => {
    return (
        <Button
            variant="ghost"
            onClick={onRun}
            disabled={isLoading || disabled}
            className="uppercase tracking-widest text-[9px] h-7 px-3 border-sharp border-main/50 hover:border-accent/50 text-secondary-text hover:text-accent"
        >
            {isLoading ? (
                <Loader2 size={10} className="animate-spin mr-1.5" />
            ) : (
                <Layers size={10} className="mr-1.5" />
            )}
            {isLoading ? 'Running_Suite...' : 'Run_Suite'}
        </Button>
    );
};
