'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { isSmartApiError } from '@smart/api-client';
import { Alert } from '@smart/ui';
import BlackLogo from '@smart/ui/assets/images/Logos/WebP/BLACK LOGO@4x.webp';
import { api, redirectForRole, storeSession } from '../../lib/api';

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
            href="#change-password"
            onClick={(e) => {
              e.preventDefault();
              alert('Please contact your administrator to reset your password.');
            }}
            className="text-sm font-semibold text-[#004c63] hover:underline"
          >
            Change password?
          </a>
        </div>

        {/* SSO Options */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="w-full border-t border-slate-200" />
          <span className="absolute bg-white px-3 text-xs uppercase tracking-wider text-slate-400">
            Or sign in with
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await api.auth.ssoStart({
                  provider: 'google',
                  redirectUri: `${window.location.origin}/auth/sso/callback`,
                });
                window.location.href = res.authorizationUrl;
              } catch {
                setError('Google SSO service unavailable.');
              }
            }}
            className="flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98]"
          >
            <GoogleIcon />
            Google
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await api.auth.ssoStart({
                  provider: 'microsoft',
                  redirectUri: `${window.location.origin}/auth/sso/callback`,
                });
                window.location.href = res.authorizationUrl;
              } catch {
                setError('Microsoft SSO service unavailable.');
              }
            }}
            className="flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98]"
          >
            <MicrosoftIcon />
            Microsoft
          </button>
        </div>
      </form>
    </section>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
      />
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
      />
      <path
        fill="#FBBC05"
        d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 17C3.7 20.7 7.5 24 12 24z"
      />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 23 23" aria-hidden="true">
      <path fill="#f35325" d="M1 1h10v10H1z" />
      <path fill="#81bc06" d="M12 1h10v10H12z" />
      <path fill="#05a6f0" d="M1 12h10v10H1z" />
      <path fill="#ffba08" d="M12 12h10v10H12z" />
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
