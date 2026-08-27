'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AppShell,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Alert,
  Input,
} from '@smart/ui';
import { api, smartFetch } from '../../lib/api';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSsoLogin = async (provider: string) => {
    try {
      setError(null);
      setLoading(provider);

      const response = await api.auth.ssoStart({
        provider,
        redirectUri: window.location.origin + '/auth/callback',
      });

      if (response?.authorizationUrl) {
        window.location.href = response.authorizationUrl;
      } else {
        throw new Error('No authorization URL returned');
      }
    } catch (err: unknown) {
      console.error(err);
      const msg =
        err instanceof Error ? err.message : 'Failed to start SSO login. Please try again.';
      setError(msg);
      setLoading(null);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    // Basic email validation
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setError(null);
      setLoading('EMAIL');

      // In a real scenario, you'd call api.auth.login({ email, password })
      // For the mock, we'll hit our added mock endpoint via fetch directly since api client might not have login method yet.
      const res = await smartFetch(
        (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        },
      );

      if (!res.ok) throw new Error('Invalid credentials');

      const data = await res.json();
      window.sessionStorage.setItem('smart.accessToken', data.accessToken);

      router.push('/institution-picker');
    } catch (err: unknown) {
      console.error(err);
      setError('Invalid email or password.');
      setLoading(null);
    }
  };

  return (
    <AppShell
      productName="SMART"
      title="Student Login"
      subtitle="Access your certification journey"
    >
      <div className="mx-auto mt-12 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials or use your preferred account to continue
            </CardDescription>
          </CardHeader>
          <div className="p-6 pt-0 flex flex-col gap-4">
            {error && (
              <Alert tone="danger" title="Authentication Error">
                {error}
              </Alert>
            )}

            <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
              <Input
                label="Email address"
                type="email"
                placeholder="Enter your Gmail address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading !== null}
                required
              />
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading !== null}
                required
                endIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-sm"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
              <Button variant="primary" type="submit" disabled={loading !== null} className="mt-2">
                {loading === 'EMAIL' ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[var(--border)]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[var(--bg-surface)] px-2 text-[var(--text-muted)]">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => handleSsoLogin('GOOGLE')}
              disabled={loading !== null}
            >
              {loading === 'GOOGLE' ? 'Connecting...' : 'Continue with Google'}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSsoLogin('GITHUB')}
              disabled={loading !== null}
            >
              {loading === 'GITHUB' ? 'Connecting...' : 'Continue with GitHub'}
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
