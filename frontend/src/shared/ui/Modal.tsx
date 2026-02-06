import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

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
            // Focus trap: focus the close button when modal opens
            setTimeout(() => {
                closeButtonRef.current?.focus();
            }, 0);
        }
    }, [isOpen]);

    // Focus trap: keep focus within modal
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
                // Shift + Tab
                if (document.activeElement === firstElement) {
                    lastElement?.focus();
                    e.preventDefault();
                }
            } else {
                // Tab
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep/80 backdrop-blur-sm"
            onMouseDown={handleBackdropMouseDown}
            onMouseUp={handleBackdropMouseUp}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div
                ref={modalRef}
                className="bg-surface border-sharp border-accent/20 glow-accent w-full max-w-[95vw] md:max-w-md overflow-hidden shadow-2xl m-4"
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-2 border-b border-main bg-deep/50">
                    <h3 id="modal-title" className="text-xs font-mono font-bold text-accent uppercase tracking-widest">
                        {title}
                    </h3>
                    <button
                        ref={closeButtonRef}
                        onClick={onClose}
                        className="text-secondary-text hover:text-primary-text transition-colors"
                        aria-label="Close modal"
                    >
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

