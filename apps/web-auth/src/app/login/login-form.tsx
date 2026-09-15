'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Alert } from '@smart/ui';
import BlackLogo from '@smart/ui/assets/images/Logos/WebP/BLACK LOGO@4x.webp';
import { api, redirectForRole, storeSession } from '../../lib/api';
import { formatLoginError } from '../../lib/login-error';
import { authAppReturnToPath } from '../../lib/return-to';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordChanged = searchParams.get('passwordChanged') === '1';

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await api.auth.login({ email, password });
      storeSession(result.accessToken);
      const authReturnTo = authAppReturnToPath(searchParams.get('returnTo'));
      if (authReturnTo) {
        router.push(authReturnTo);
        return;
      }
      redirectForRole(result.user.role, result.accessToken, searchParams.get('returnTo'));
    } catch (err) {
      setError(formatLoginError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex w-full max-w-sm flex-col items-start justify-center px-4 py-8 sm:px-0">
      {/* Black Logo */}
      <div className="mb-4">
        <Image
          src={BlackLogo}
          alt="SMART Logo"
          width={180}
          height={48}
          className="h-9 w-auto object-contain"
          priority
        />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Your future starts here
      </h1>

      {passwordChanged ? (
        <div className="mt-4 w-full">
          <Alert tone="success" title="Password updated. Sign in with your new password." />
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 w-full">
          <Alert tone="danger" title={error} />
        </div>
      ) : null}

      {/* Login Form */}
      <form onSubmit={onSubmit} className="mt-6 w-full space-y-5">
        {/* Email field */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-xs font-semibold text-slate-800">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border-2 border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#004c63] focus:outline-none focus:ring-2 focus:ring-[#004c63]/20"
          />
        </div>

        {/* Password field */}
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-xs font-semibold text-slate-800">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border-2 border-slate-300 bg-white px-4 py-3 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#004c63] focus:outline-none focus:ring-2 focus:ring-[#004c63]/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        {/* Green Sign in Button */}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex w-full items-center justify-center rounded-md bg-[#004c63] py-3.5 text-base font-semibold text-white shadow-sm transition-all hover:bg-[#003a4d] active:scale-[0.99] disabled:opacity-70"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Signing in…
            </span>
          ) : (
            'Sign in'
          )}
        </button>

        {/* Change password link */}
        <div className="pt-2 text-center">
          <a
            href="/change-password"
            className="text-sm font-semibold text-[#004c63] hover:underline"
          >
            Change password?
          </a>
        </div>
      </form>
    </section>
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
