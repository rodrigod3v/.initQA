import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/shared/api';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Card } from '@/shared/ui/Card';

const Login: React.FC = () => {
    const [email, setEmail] = useState('admin@initqa.com');
    const [password, setPassword] = useState('admin123');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await api.post('/auth/login', { email, password });
            login(response.data.access_token);
            navigate('/projects');
        } catch (err: unknown) {
            const errorResponse = err as { response?: { data?: { message?: string } } };
            const message = errorResponse.response?.data?.message || 'Authentication failed. Check your credentials.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-deep flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Subtle Grid Background */}
            <div className="absolute inset-0 z-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(var(--border-main) 1px, transparent 0)', backgroundSize: '24px 24px' }} />

            <div className="w-full max-w-md z-10">
                <div className="mb-8 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Terminal className="text-accent w-10 h-10" />
                        <h1 className="text-3xl font-bold tracking-tighter text-primary-text">
                            .init<span className="text-accent">QA</span>
                        </h1>
                    </div>
                    <p className="text-xs font-mono text-secondary-text uppercase tracking-widest">
                        Professional API Testing Platform
                    </p>
                </div>

                <Card className="border-accent/20 glow-accent bg-surface/80 backdrop-blur-sm">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex items-center gap-2 text-[10px] font-mono text-accent/70 uppercase mb-4 border-b border-main pb-2">
                            <ShieldCheck size={12} />
                            Authentication Required
                        </div>

                        {error && (
                            <div className="bg-danger/10 border border-danger/30 p-3 flex items-start gap-3">
                                <AlertCircle className="text-danger shrink-0" size={16} />
                                <span className="text-xs font-mono text-danger uppercase leading-tight">{error}</span>
                            </div>
                        )}

                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="user@organization.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />

                        <Input
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />

                        <Button
                            type="submit"
                            className="w-full uppercase tracking-widest py-3"
                            glow
                            disabled={isLoading}
                        >
                            {isLoading ? 'Authenticating...' : 'Sign In'}
                        </Button>

                        <div className="pt-4 border-t border-main">
                            <p className="text-[10px] font-mono text-secondary-text text-center italic">
                                Enterprise access managed by organization protocol.
                            </p>
                        </div>
                    </form>
                </Card>

                <p className="text-center mt-8 text-secondary-text font-mono text-[10px] uppercase tracking-widest">
                    Demo Credentials: admin@initqa.com / admin123
                </p>
            </div>
        </div>
    );
};

export default Login;
