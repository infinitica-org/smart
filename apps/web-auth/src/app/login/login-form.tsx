'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { isSmartApiError } from '@smart/api-client';
import {
  Alert,
  AnimatedGridPattern,
  Button,
  Input,
  MagicCard,
  ShineBorder,
  SmartLogo,
} from '@smart/ui';
import { api, redirectForRole, storeSession } from '../../lib/api';

const PORTAL_HINTS = [
  { role: 'Student', destination: 'Readiness dashboard & applications' },
  { role: 'TPO', destination: 'Cohorts, JD inbox & shortlists' },
  { role: 'Admin', destination: 'Institutions, tenants & platform ops' },
] as const;

export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    } catch (err) {
      if (
        isSmartApiError(err) &&
        (err.code === 'institution_held' ||
          err.code === 'institution_deactivated' ||
          err.code === 'account_held')
      ) {
        setError(err.message);
      } else {
        setError('Login failed. Check email and password.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative flex min-h-dvh flex-col justify-center overflow-hidden px-6 py-16 sm:px-10">
      <AnimatedGridPattern
        className="fill-brand-500/5 stroke-brand-500/5 lg:hidden"
        numSquares={24}
        maxOpacity={0.12}
      />

      <div className="relative z-10 mx-auto w-full max-w-md">
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <SmartLogo kind="wordmark" className="h-8" title="SMART" />
        </div>

        <MagicCard className="rounded-[var(--radius-card)] p-8 sm:p-9">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">
              Secure sign-in
            </p>
            <h2 className="font-heading text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Welcome back
            </h2>
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              Use your institution email. We&apos;ll open the portal built for your role.
            </p>
          </div>

          {error ? (
            <div className="mt-6">
              <Alert tone="danger" title={error} />
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              endIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="rounded-md p-0.5 transition-colors hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              }
            />

            <Button type="submit" isLoading={loading} fullWidth size="lg">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </MagicCard>
      </div>
    </section>
  );
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a17.36 17.36 0 0 1-3.44 4.06M6.6 6.6A17.3 17.3 0 0 0 1 12s4 8 11 8a10.9 10.9 0 0 0 5.1-1.26" />
      <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
