'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { isSmartApiError } from '@smart/api-client';
import { SmartLogo } from '@smart/ui';
import { api, redirectForRole, storeSession } from '../../lib/api';

const inputClass =
  'w-full rounded-lg border border-[#e2e8f0] bg-white px-4 py-3.5 text-[15px] text-[#172033] placeholder:text-[#94a3b8] transition-[border-color,box-shadow] focus:border-[#0f9f8f] focus:outline-none focus:ring-2 focus:ring-[#ecfdf5]';

const labelClass = 'mb-2 block text-[13px] font-medium tracking-[-0.01em] text-[#64748b]';

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
    <section className="flex w-full max-w-[420px] flex-col items-center text-center">
      <SmartLogo kind="mark" tone="on-light" className="mx-auto size-11" title="SMART" />

      <h1 className="mt-10 text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-[#172033] sm:text-[2.125rem]">
        Hello, there !
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed tracking-[-0.01em] text-[#64748b]">
        The future, together.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-6 w-full rounded-lg border border-[#f3c8cc] bg-[#fff1f2] px-4 py-3 text-left text-sm text-[#c24141]"
        >
          {error}
        </p>
      ) : null}

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

        <div>
          <label htmlFor="password" className={labelClass}>
            Your Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#94a3b8] transition hover:text-[#64748b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#172033]"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex w-full items-center justify-between rounded-lg bg-[#172033] px-5 py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#0f172a] disabled:opacity-70"
        >
          <span>{loading ? 'Signing in…' : 'Sign in'}</span>
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <ArrowUpRightIcon />
          )}
        </button>

        <div className="flex justify-end pt-1">
          <a
            href="#forgot-password"
            onClick={(e) => {
              e.preventDefault();
              alert('Please contact your administrator to reset your password.');
            }}
            className="text-[13px] font-medium text-[#172033] underline-offset-4 transition hover:underline"
          >
            Forgot Password
          </a>
        </div>
      </form>
    </section>
  );
}

function ArrowUpRightIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </svg>
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
