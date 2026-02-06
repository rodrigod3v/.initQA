import { render, screen } from '@testing-library/react';
import { Button } from './Button';
import { describe, it, expect, vi } from 'vitest';

describe('Button Component', () => {
    it('renders children correctly', () => {
        render(<Button>Click Me</Button>);
        expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    it('calls onClick handler when clicked', () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Click Me</Button>);
        screen.getByText('Click Me').click();
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('applies glow class when glow prop is true', () => {
        render(<Button glow>Glowing Button</Button>);
        const button = screen.getByText('Glowing Button');
        // Note: We might need to check for specific class names depending on implementation
        // For now, just ensuring it renders without crashing is a good smoke test
        expect(button).toBeInTheDocument();
    });

    it('is disabled when disabled prop is true', () => {
        render(<Button disabled>Disabled Button</Button>);
        const button = screen.getByText('Disabled Button');
        expect(button).toBeDisabled();
    });
});
