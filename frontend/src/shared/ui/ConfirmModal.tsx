import React, { useEffect, useRef } from 'react';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'CONFIRM',
    cancelText = 'CANCEL'
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const cancelButtonRef = useRef<HTMLButtonElement>(null);

    // Handle Escape key press
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    // Initial focus when opening
    useEffect(() => {
        if (isOpen) {
            // Focus the cancel button when modal opens (safer default)
            setTimeout(() => {
                cancelButtonRef.current?.focus();
            }, 0);
        }
    }, [isOpen]);

    // Focus trap
    useEffect(() => {
        if (!isOpen || !modalRef.current) return;

        const modal = modalRef.current;
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        const handleTab = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    lastElement?.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === lastElement) {
                    firstElement?.focus();
                    e.preventDefault();
                }
            }
        };

        modal.addEventListener('keydown', handleTab as EventListener);
        return () => modal.removeEventListener('keydown', handleTab as EventListener);
    }, [isOpen]);

    const backdropRef = useRef<HTMLDivElement>(null);
    const mouseDownOnBackdrop = useRef(false);

    if (!isOpen) return null;

    const handleBackdropMouseDown = (e: React.MouseEvent) => {
        if (e.target === backdropRef.current) {
            mouseDownOnBackdrop.current = true;
        } else {
            mouseDownOnBackdrop.current = false;
        }
    };

    const handleBackdropMouseUp = (e: React.MouseEvent) => {
        if (mouseDownOnBackdrop.current && e.target === backdropRef.current) {
            onClose();
        }
        mouseDownOnBackdrop.current = false;
    };

    return (
        <div
            ref={backdropRef}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep/90 backdrop-blur-sm"
            onMouseDown={handleBackdropMouseDown}
            onMouseUp={handleBackdropMouseUp}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            aria-describedby="confirm-modal-description"
        >
            <div
                ref={modalRef}
                className="bg-surface border-sharp border-danger/30 glow-danger w-full max-w-md overflow-hidden shadow-2xl"
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 px-4 py-3 border-b border-main bg-danger/10">
                    <AlertTriangle size={18} className="text-danger" aria-hidden="true" />
                    <h3 id="confirm-modal-title" className="text-xs font-mono font-bold text-danger uppercase tracking-widest">
                        {title}
                    </h3>
                </div>
                <div className="p-6 space-y-6">
                    <p id="confirm-modal-description" className="text-sm font-mono text-secondary-text leading-relaxed uppercase tracking-tight">
                        {message}
                    </p>
                    <div className="flex gap-3">
                        <Button
                            ref={cancelButtonRef}
                            variant="ghost"
                            onClick={onClose}
                            className="flex-1 text-xs uppercase tracking-widest"
                        >
                            {cancelText}
                        </Button>
                        <Button
                            variant="danger"
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
            </div>
        </div>
    );
};
