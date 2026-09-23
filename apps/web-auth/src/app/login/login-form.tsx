'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { isSmartApiError } from '@smart/api-client';
import { SmartLogo } from '@smart/ui';
import { ArrowUpRightIcon, EyeIcon, EyeOffIcon } from '../../components/auth-icons';
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

      <h1 className="mt-8 text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] text-[#172033] sm:text-[2rem]">
        Students and alumni,
        <br />
        sign in to SMART
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[#475569]">
        Get certified, get verified, get hired — one account for every portal.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-6 w-full rounded-lg border border-[#f3c8cc] bg-[#fff1f2] px-4 py-3 text-left text-sm text-[#c24141]"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-8 w-full space-y-4">
        <button
          type="button"
          onClick={() => {
            alert('Google authentication will redirect to your school single sign-on provider.');
          }}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-[#e2e8f0] bg-white px-4 py-3 text-[14px] font-semibold text-[#172033] shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="relative flex items-center justify-center py-2">
          <div className="w-full border-t border-[#e2e8f0]" />
          <span className="absolute bg-[#f8fafc] px-3 text-xs font-medium text-[#94a3b8]">
            or sign in with school email
          </span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-2 w-full space-y-5 text-left">
        <div>
          <label htmlFor="email" className={labelClass}>
            School Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="student@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            Password
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
          <span>{loading ? 'Signing in…' : 'Continue'}</span>
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <ArrowUpRightIcon />
          )}
        </button>

        <div className="flex items-center justify-between pt-1 text-[13px]">
          <a
            href="/register"
            className="font-medium text-[#0f9f8f] underline-offset-4 transition hover:underline"
          >
            Create an account / Register
          </a>
          <a
            href="/forgot-password"
            className="font-medium text-[#172033] underline-offset-4 transition hover:underline"
          >
            Forgot Password
          </a>
        </div>

        <div className="border-t border-[#e2e8f0] pt-4 text-center text-[13px] text-[#64748b]">
          Hiring students?{' '}
          <a
            href="/register?role=employer"
            className="font-semibold text-[#172033] underline-offset-4 hover:underline"
          >
            Sign up as an employer
          </a>
        </div>
      </form>
    </section>
  );
}
