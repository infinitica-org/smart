'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { SmartLogo } from '@smart/ui';
import { ResendVerification } from '../../../components/resend-verification';
import { api } from '../../../lib/api';
import { LoginShell } from '../../login/login-shell';

type Status = 'pending' | 'success' | 'error';

export default function VerifyEmailPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [status, setStatus] = useState<Status>('pending');
  const [resendEmail, setResendEmail] = useState('');
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
        ? 'This verification link is invalid or has expired. Enter your email to get a new one.'
        : 'Give us a moment.';

  return (
    <LoginShell>
      <section className="flex w-full max-w-[420px] flex-col items-center text-center">
        <SmartLogo kind="text" tone="on-light" className="mx-auto h-8 w-auto" title="SMART" />

        <h1 className="mt-8 text-[1.75rem] font-bold leading-tight tracking-tight text-[#111827] sm:text-[2rem]">
          {heading}
        </h1>
        <p className="mt-2.5 text-[15px] leading-relaxed text-[#6b7280]">{message}</p>

        {status === 'error' ? (
          <div className="mt-6 w-full text-left">
            <label
              htmlFor="resend-email"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#6b7280]"
            >
              Your email
            </label>
            <input
              id="resend-email"
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              className="h-11 w-full rounded-[11px] border border-[#e5e7eb] bg-white px-3.5 text-sm text-[#111827] focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
            />
            <ResendVerification email={resendEmail} />
          </div>
        ) : null}

        {status === 'pending' ? (
          <span
            role="status"
            aria-live="polite"
            className="mt-8 h-8 w-8 animate-spin rounded-full border-2 border-black/15 border-t-black"
          />
        ) : (
          <a
            href="/login"
            className="mt-8 flex h-11 w-full items-center justify-center rounded-[11px] bg-black px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 active:scale-[0.98]"
          >
            Back to sign in
          </a>
        )}
      </section>
    </LoginShell>
  );
}
