import React from 'react';

interface TabsProps {
    tabs: { id: string; label: string }[];
    activeTab: string;
    onTabChange: (id: string) => void;
    className?: string;
    rightContent?: React.ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange, className = '', rightContent }) => {
    return (
        <div className={`flex items-center justify-between border-b border-main/10 bg-deep/30 h-10 shrink-0 ${className}`}>
            <div className="flex h-full">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`px-4 h-full text-[10px] font-mono uppercase tracking-widest transition-all relative flex items-center
                ${activeTab === tab.id
                                ? 'text-accent border-b-2 border-accent bg-surface/50'
                                : 'text-secondary-text hover:text-primary-text hover:bg-surface/20'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            {rightContent && <div className="flex items-center h-full pr-1">{rightContent}</div>}
        </div>
    );
};
