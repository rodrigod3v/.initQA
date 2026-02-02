import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep/80 backdrop-blur-sm">
            <div className="bg-surface border-sharp border-accent/20 glow-accent w-full max-w-md overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-4 py-2 border-b border-main bg-deep/50">
                    <h3 className="text-xs font-mono font-bold text-accent uppercase tracking-widest">{title}</h3>
                    <button onClick={onClose} className="text-secondary-text hover:text-primary-text transition-colors">
                        <X size={16} />
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};
