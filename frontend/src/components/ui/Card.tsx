import React from 'react';

interface CardProps {
    children: React.ReactNode;
    title?: string;
    className?: string;
    headerAction?: React.ReactNode;
    onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, title, className = '', headerAction, onClick }) => {
    return (
        <div
            className={`bg-surface border-sharp border-main overflow-hidden ${className}`}
            onClick={onClick}
            style={onClick ? { cursor: 'pointer' } : undefined}
        >
            {(title || headerAction) && (
                <div className="flex items-center justify-between px-4 py-2 border-b border-main bg-deep/50">
                    {title && <h3 className="text-xs font-mono font-bold text-accent uppercase tracking-widest">{title}</h3>}
                    {headerAction}
                </div>
            )}
            <div className="p-4">
                {children}
            </div>
        </div>
    );
};
