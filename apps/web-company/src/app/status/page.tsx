'use client';

import { useEffect, useState } from 'react';
import type { AuthenticatedUser } from '@smart/contracts';
import { Alert, Card, CardDescription, CardHeader, CardTitle, SignOutButton } from '@smart/ui';
import { api } from '../../lib/api';
import { signOut } from '../../lib/auth';

const STATUS_COPY: Record<
  NonNullable<AuthenticatedUser['companyVerificationStatus']>,
  { tone: 'success' | 'warning' | 'danger'; title: string; body: string }
> = {
  PENDING: {
    tone: 'warning',
    title: 'Verification pending',
    body: "We're reviewing your company details. This is usually quick — you'll be notified by email as soon as a decision is made.",
  },
  APPROVED: {
    tone: 'success',
    title: 'Verified',
    body: 'Your company is verified on SMART.',
  },
  REJECTED: {
    tone: 'danger',
    title: 'Verification unsuccessful',
    body: 'We were unable to verify your company. Check your email for details.',
  },
};

export default function StatusPage() {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth
      .me()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  const status = user?.companyVerificationStatus ?? null;
  const copy = status ? STATUS_COPY[status] : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--ds-text)]">
          {user?.companyName ?? 'Company dashboard'}
        </h1>
        <SignOutButton onSignOut={signOut} />
      </div>

      {loading ? (
        <p className="text-sm text-[var(--ds-text-muted)]">Loading…</p>
      ) : (
        <>
          {copy ? (
            <Alert tone={copy.tone} title={copy.title}>
              {copy.body}
            </Alert>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Hiring dashboard</CardTitle>
              <CardDescription>
                {status === 'APPROVED'
                  ? 'Job postings and candidate matching land here next.'
                  : 'Unlocks once your company is verified.'}
              </CardDescription>
            </CardHeader>
          </Card>
        </>
      )}
    </main>
  );
}
