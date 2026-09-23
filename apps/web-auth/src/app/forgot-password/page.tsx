'use client';

import { useState } from 'react';
import { SmartLogo } from '@smart/ui';
import { api } from '../../lib/api';
import { LoginShell } from '../login/login-shell';

const inputClass =
  'w-full rounded-lg border border-[#e2e8f0] bg-white px-4 py-3.5 text-[15px] text-[#172033] placeholder:text-[#94a3b8] transition-[border-color,box-shadow] focus:border-[#0f9f8f] focus:outline-none focus:ring-2 focus:ring-[#ecfdf5]';

const labelClass = 'mb-2 block text-[13px] font-medium tracking-[-0.01em] text-[#64748b]';

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
        <SmartLogo kind="mark" tone="on-light" className="mx-auto size-11" title="SMART" />

        <h1 className="mt-10 text-[2.5rem] font-semibold leading-tight tracking-[-0.03em] text-[#172033] sm:text-[2.875rem]">
          Reset your password
        </h1>
        <p className="mt-3 text-[17px] leading-relaxed tracking-[-0.01em] text-[#64748b] sm:text-lg">
          {submitted
            ? "If that email has a SMART account, we've sent a reset link."
            : "Enter your email and we'll send you a reset link."}
        </p>

        {submitted ? (
          <a
            href="/login"
            className="mt-8 flex w-full items-center justify-center rounded-lg bg-[#172033] px-5 py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#0f172a]"
          >
            Back to sign in
          </a>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 w-full space-y-5 text-left">
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
              className="mt-2 flex w-full items-center justify-center rounded-lg bg-[#172033] px-5 py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#0f172a] disabled:opacity-70"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>

            <div className="flex justify-center pt-1">
              <a
                href="/login"
                className="text-[13px] font-medium text-[#172033] underline-offset-4 transition hover:underline"
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
