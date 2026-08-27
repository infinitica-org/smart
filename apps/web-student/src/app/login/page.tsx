'use client';

import { useState } from 'react';
import { AppShell, Button, Card, CardDescription, CardHeader, CardTitle, Alert } from '@smart/ui';
import { api } from '../../lib/api';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

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
            <CardDescription>Use your institution or preferred account to continue</CardDescription>
          </CardHeader>
          <div className="p-6 pt-0 flex flex-col gap-4">
            {error && (
              <Alert tone="danger" title="Authentication Error">
                {error}
              </Alert>
            )}

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

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[var(--border)]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[var(--bg-surface)] px-2 text-[var(--text-muted)]">
                  Or institution
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={() => handleSsoLogin('SAML')}
              disabled={loading !== null}
            >
              {loading === 'SAML' ? 'Connecting...' : 'Institution SSO'}
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
