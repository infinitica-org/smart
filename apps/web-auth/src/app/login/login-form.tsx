'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { isSmartApiError } from '@smart/api-client';
import { SmartLogo } from '@smart/ui';
import { ArrowUpRightIcon, EyeIcon, EyeOffIcon } from '../../components/auth-icons';
import { api, redirectForRole, storeSession } from '../../lib/api';

const inputClass =
  'w-full h-11 rounded-[11px] border border-[#e5e7eb] bg-white px-3.5 text-sm text-[#111827] placeholder:text-[#9ca3af] transition-[border-color,box-shadow] duration-150 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10';

const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#6b7280]';

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
      <SmartLogo kind="wordmark" className="mx-auto h-8 w-auto" title="SMART" />

      {/* Role Toggle Selector */}
      {/* <div className="mt-6 flex w-full max-w-[280px] rounded-[11px] bg-neutral-100 p-1">
        <span className="flex-1 rounded-[8px] bg-white py-1.5 text-xs font-semibold text-neutral-900 shadow-xs">
          Student
        </span>
        <Link
          href="/company/login"
          className="flex-1 rounded-[8px] py-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition"
        >
          Company / Employer
        </Link>
      </div> */}

      <h1 className="mt-6 text-[1.75rem] font-bold leading-tight tracking-tight text-[#111827] sm:text-[2rem]">
        Students and alumni,
        <br />
        sign in to SMART
      </h1>
      <p className="mt-2.5 text-[15px] leading-relaxed text-[#6b7280]">
        Get certified, get verified, get hired — one account for every portal.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-5 w-full rounded-[11px] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-left text-sm text-rose-700"
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
          className="flex h-11 w-full items-center justify-center gap-3 rounded-[11px] border border-[#e5e7eb] bg-white px-4 text-sm font-semibold text-[#111827] shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
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
          <div className="w-full border-t border-[#e5e7eb]" />
          <span className="absolute bg-white px-3 text-xs font-medium text-[#9ca3af]">
            or sign in with school email
          </span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-2 w-full space-y-4 text-left">
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#9ca3af] transition hover:text-[#4b5563] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-3 flex h-11 w-full items-center justify-between rounded-[11px] bg-black px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 active:scale-[0.98] disabled:opacity-70"
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
            href="/forgot-password"
            className="font-medium text-[#111827] underline-offset-4 transition hover:underline"
          >
            Forgot Password
          </a>
          <a
            href="/register"
            className="font-medium text-[#111827] underline-offset-4 transition hover:underline"
          >
            Create account
          </a>
        </div>

        <div className="border-t border-[#e5e7eb] pt-4 text-center text-[13px] text-[#6b7280] space-y-1.5">
          <div>
            Hiring students?{' '}
            <Link
              href="/company/register"
              className="font-semibold text-[#111827] underline-offset-4 hover:underline"
            >
              Sign up as an employer
            </Link>
          </div>
          <div>
            Already registered?{' '}
            <Link
              href="/company/login"
              className="font-medium text-[#111827] underline-offset-4 hover:underline"
            >
              Employer Sign In
            </Link>
          </div>
        </div>
      </form>
    </section>
  );
}
