import React, { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    glow?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
    children,
    variant = 'primary',
    size = 'md',
    glow = false,
    className = '',
    ...props
}, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-mono font-medium transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none border-sharp';

    const variants = {
        primary: 'bg-accent/10 text-accent border-accent/30 hover:bg-accent/20 active:bg-accent/30',
        secondary: 'bg-surface text-primary-text border-main hover:bg-surface/80',
        danger: 'bg-danger/10 text-danger border-danger/30 hover:bg-danger/20',
        ghost: 'bg-transparent text-secondary-text border-transparent hover:text-primary-text hover:bg-surface'
    };

    const sizes = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base'
    };

    const glowStyles = glow && variant === 'primary' ? 'glow-accent' : (glow && variant === 'danger' ? 'glow-danger' : '');

    return (
        <button
            ref={ref}
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${glowStyles} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
});

Button.displayName = 'Button';

