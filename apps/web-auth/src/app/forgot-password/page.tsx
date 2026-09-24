'use client';

import { useState } from 'react';
import { SmartLogo } from '@smart/ui';
import { api } from '../../lib/api';
import { LoginShell } from '../login/login-shell';

const inputClass =
  'w-full h-11 rounded-[11px] border border-[#e5e7eb] bg-white px-3.5 text-sm text-[#111827] placeholder:text-[#9ca3af] transition-[border-color,box-shadow] duration-150 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10';

const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#6b7280]';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await api.auth.requestPasswordReset({ email });
    } finally {
      // Always show the same confirmation, whether or not the email matched an
      // account — the server never reveals existence, and neither should we.
      setLoading(false);
      setSubmitted(true);
    }
  }

  return (
    <LoginShell>
      <section className="flex w-full max-w-[420px] flex-col items-center text-center">
        <SmartLogo kind="wordmark" tone="on-light" className="mx-auto h-8 w-auto" title="SMART" />

        <h1 className="mt-8 text-[1.75rem] font-bold leading-tight tracking-tight text-[#111827] sm:text-[2rem]">
          Reset your password
        </h1>
        <p className="mt-2.5 text-[15px] leading-relaxed text-[#6b7280]">
          {submitted
            ? "If that email has a SMART account, we've sent a reset link."
            : "Enter your email and we'll send you a reset link."}
        </p>

        {submitted ? (
          <a
            href="/login"
            className="mt-8 flex h-11 w-full items-center justify-center rounded-[11px] bg-black px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 active:scale-[0.98]"
          >
            Back to sign in
          </a>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 w-full space-y-4 text-left">
            <div>
              <label htmlFor="email" className={labelClass}>
                Your Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-11 w-full items-center justify-center rounded-[11px] bg-black px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>

            <div className="flex justify-center pt-2">
              <a
                href="/login"
                className="text-xs font-semibold text-[#111827] underline-offset-4 hover:underline"
              >
                Back to sign in
              </a>
            </div>
          </form>
        )}
      </section>
    </LoginShell>
  );
}
