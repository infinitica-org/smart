'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { SmartLogo } from '@smart/ui';
import { api } from '../../../lib/api';
import { LoginShell } from '../../login/login-shell';

type Status = 'pending' | 'success' | 'error';

export default function VerifyEmailPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [status, setStatus] = useState<Status>('pending');
  // The confirm endpoint is single-use (a second call 410s even on success),
  // so this must fire at most once per token — React's dev-mode StrictMode
  // double-invokes effects, which would otherwise race a real 204 against a
  // spurious 410 and could leave the UI on the failure branch.
  const requestedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (requestedTokenRef.current === token) return;
    requestedTokenRef.current = token;

    api.auth
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  const heading =
    status === 'success' ? 'Email verified' : status === 'error' ? 'Link not valid' : 'Verifying…';
  const message =
    status === 'success'
      ? 'Your email is confirmed. You can sign in now.'
      : status === 'error'
        ? 'This verification link is invalid or has expired.'
        : 'Give us a moment.';

  return (
    <LoginShell>
      <section className="flex w-full max-w-[420px] flex-col items-center text-center">
        <SmartLogo kind="mark" tone="on-light" className="mx-auto size-11" title="SMART" />

        <h1 className="mt-10 text-[2.5rem] font-semibold leading-tight tracking-[-0.03em] text-[#172033] sm:text-[2.875rem]">
          {heading}
        </h1>
        <p className="mt-3 text-[17px] leading-relaxed tracking-[-0.01em] text-[#64748b] sm:text-lg">
          {message}
        </p>

        {status === 'pending' ? (
          <span
            role="status"
            aria-live="polite"
            className="mt-8 h-8 w-8 animate-spin rounded-full border-2 border-[#172033]/15 border-t-[#172033]"
          />
        ) : (
          <a
            href="/login"
            className="mt-8 flex w-full items-center justify-center rounded-lg bg-[#172033] px-5 py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#0f172a]"
          >
            Back to sign in
          </a>
        )}
      </section>
    </LoginShell>
  );
}
