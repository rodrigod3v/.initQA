import React from 'react';

interface TabsProps {
    tabs: { id: string; label: string }[];
    activeTab: string;
    onTabChange: (id: string) => void;
    className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange, className = '' }) => {
    return (
        <div className={`flex border-b border-main bg-deep/30 ${className}`}>
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`px-4 py-2 text-xs font-mono uppercase tracking-widest transition-all relative
            ${activeTab === tab.id
                            ? 'text-accent border-b-2 border-accent bg-surface/50'
                            : 'text-secondary-text hover:text-primary-text hover:bg-surface/20'
                        }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};
