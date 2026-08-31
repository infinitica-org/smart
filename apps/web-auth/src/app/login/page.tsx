'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, Button, Card, CardDescription, CardHeader, CardTitle, Input } from '@smart/ui';
import { api, redirectForRole, storeSession } from '../../lib/api';

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await api.auth.login({ email, password });
      storeSession(result.accessToken);
      redirectForRole(result.user.role, result.accessToken, searchParams.get('returnTo'));
    } catch {
      setError('Login failed. Check email and password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-8 mt-16">
      <Card>
        <CardHeader>
          <CardTitle>Sign in to SMART</CardTitle>
          <CardDescription>
            Use your institution email and password. Your role opens the matching portal.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit} className="px-6 pb-6 space-y-4">
          {error ? <Alert tone="danger" title={error} /> : null}
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <p className="p-8 text-sm text-[var(--text-muted)]" role="status">
          Loading sign-in…
        </p>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
