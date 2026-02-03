import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'danger' | 'accent';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    variant = 'danger'
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-6">
                <div className="flex items-start gap-4">
                    <div className={`p-2 border-sharp border ${variant === 'danger' ? 'bg-danger/10 border-danger/30 text-danger' : 'bg-accent/10 border-accent/30 text-accent'}`}>
                        <AlertTriangle size={24} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-mono text-primary-text leading-relaxed uppercase">
                            {message}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="flex-1 text-xs uppercase tracking-widest"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant={variant === 'danger' ? 'danger' : 'primary'}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        glow
                        className="flex-1 text-xs uppercase tracking-widest"
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
