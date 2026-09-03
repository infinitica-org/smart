'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@smart/ui';
import { api } from '../../lib/api';

/**
 * Reverse CN-T01 gate: completed candidates must not remain on /onboarding.
 * Source of truth is GET /users/me (AuthenticatedUser.onboardingCompleted).
 */
export function OnboardingExitGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'allowed'>('loading');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const me = await api.auth.me();
        if (cancelled) return;
        if (me.role === 'STUDENT' && me.onboardingCompleted) {
          router.replace('/dashboard');
          return;
        }
        setState('allowed');
      } catch {
        if (!cancelled) {
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

  return children;
}
