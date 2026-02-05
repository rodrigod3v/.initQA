import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
    return (
        <div className="flex flex-col gap-1 w-full">
            {label && <label className="text-xs font-mono text-secondary-text uppercase tracking-wider">{label}</label>}
            <input
                className={`bg-deep border-sharp border-main px-3 py-2 text-sm text-primary-text font-mono focus:border-accent/50 focus:outline-none transition-colors placeholder:text-text-sub/50 ${error ? 'border-danger/50' : ''} ${className}`}
                {...props}
            />
            {error && <span className="text-[10px] font-mono text-danger uppercase tracking-tighter">{error}</span>}
        </div>
    );
};
