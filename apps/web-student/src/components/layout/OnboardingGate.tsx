'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AppShell, Button } from '@smart/ui';
import { api } from '../../lib/api';

/**
 * CN-T01 server-side gate: candidate console requires AuthenticatedUser.onboardingCompleted.
 * Clearing localStorage cannot bypass this check.
 */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'allowed' | 'denied'>('loading');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const me = await api.auth.me();
        if (cancelled) return;
        if (me.role === 'STUDENT' && !me.onboardingCompleted) {
          setState('denied');
          router.replace('/onboarding');
          return;
        }
        setState('allowed');
      } catch {
        if (!cancelled) {
          setState('denied');
          router.replace('/login');
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state === 'loading') {
    return (
      <AppShell
        productName="SMART · Candidate"
        title="Checking access…"
        subtitle="Verifying onboarding status with the server."
      >
        <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
      </AppShell>
    );
  }

  if (state === 'denied') {
    return (
      <AppShell
        productName="SMART · Candidate"
        title="Access denied"
        subtitle="Complete mandatory onboarding first."
      >
        <Alert tone="warning" title="Onboarding required">
          Your account has not completed server-side onboarding. Local browser storage cannot unlock
          the dashboard.
        </Alert>
        <div className="mt-4">
          <Button type="button" onClick={() => router.replace('/onboarding')}>
            Continue onboarding
          </Button>
        </div>
      </AppShell>
    );
  }

  return children;
}
