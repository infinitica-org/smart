'use client';

import { useState } from 'react';
import Link from 'next/link';
import { isSmartApiError, storeAccessToken } from '@smart/api-client';
import { SmartLogo } from '@smart/ui';
import { api } from '../lib/api';

// Mock bypass removed

const STEPS = [
  { n: 1, label: 'Login to your account', active: true },
  { n: 2, label: 'Upload Candidates', active: false },
  { n: 3, label: 'Track Readiness', active: false },
] as const;

export function InstitutionLogin() {
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
      const role = result.user.role;
      if (role !== 'INSTITUTION_ADMIN' && role !== 'PLACEMENT_STAFF') {
        setError('This portal is for institution and placement staff accounts.');
        return;
      }
      storeAccessToken(result.accessToken);
      window.location.replace('/');
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
    <div className="flex min-h-dvh bg-black text-white p-2 lg:p-2">
      {/* Left brand panel - Floating rounded rectangle */}
      <aside className="relative hidden w-1/2 flex-col overflow-hidden rounded-[2rem] bg-[url('/gradient.svg')] bg-cover bg-center px-12 py-16 lg:flex xl:px-24">
        <div className="relative z-10 flex flex-col items-start justify-end mt-auto mb-8 w-full max-w-md mx-auto space-y-12">
          <div className="flex flex-col items-center space-y-8 text-center">
            <SmartLogo kind="wordmark" tone="on-dark" className="h-8 text-white" title="SMART" />

            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-white">
                Get Started with Us
              </h1>
              <p className="text-[15px] text-white/70">
                Complete these easy steps to register your account.
              </p>
            </div>
          </div>

          <ol className="flex flex-col w-full gap-3">
            {STEPS.map((step) => (
              <li
                key={step.n}
                className={
                  step.active
                    ? 'flex items-center gap-4 rounded-2xl bg-white px-5 py-4 text-black'
                    : 'flex items-center gap-4 rounded-2xl bg-black/40 px-5 py-4 text-white/50 backdrop-blur-sm'
                }
              >
                <span
                  className={
                    step.active
                      ? 'flex h-6 w-6 items-center justify-center rounded-full bg-black text-xs font-bold text-white'
                      : 'flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold'
                  }
                >
                  {step.n}
                </span>
                <span className="text-[15px] font-medium">{step.label}</span>
              </li>
            ))}
          </ol>
        </div>
      </aside>

      {/* Right form */}
      <section className="flex flex-1 flex-col justify-start pt-16 lg:pt-32 px-6 pb-12 sm:px-12 lg:px-24">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-4 flex justify-start">
            <img src="/mark-white.svg" alt="SMART" className="h-14 w-auto" />
          </div>

          <div className="space-y-3 mb-10 text-left">
            <h2 className="text-[28px] font-semibold tracking-tight text-white">
              Institution Login
            </h2>
            <p className="text-[15px] text-white/50">
              Enter your credentials to access the portal.
            </p>
          </div>

          {error ? (
            <p
              className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 text-center"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-6">
            <label className="flex flex-col gap-2.5">
              <span className="text-[14px] font-medium text-white/90">Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                placeholder="eg. admin@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 rounded-2xl border border-white/5 bg-[#161616] px-5 text-white placeholder:text-white/30 outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
              />
            </label>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label htmlFor="tpo-password" className="text-[14px] font-medium text-white/90">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="tpo-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 w-full rounded-2xl border border-white/5 bg-[#161616] px-5 pr-12 text-white placeholder:text-white/30 outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute top-1/2 right-4 -translate-y-1/2 rounded-md p-1 text-white/30 hover:text-white/70"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <p className="text-[13px] text-white/40 mt-2">Must be at least 8 characters.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-8 flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-[16px] font-medium text-primary-foreground transition-all hover:opacity-90 hover:scale-[1.02] active:scale-100 shadow-[0_0_20px_rgba(0,250,208,0.3)] disabled:opacity-60 disabled:hover:scale-100 disabled:shadow-none"
              style={{ fontFamily: 'Axiforma, sans-serif' }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-8 text-left text-[14px] text-white/50">
            Already have an account?{' '}
            <Link
              href="#"
              className="font-semibold text-white hover:text-primary transition-colors hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </section>
    </div>
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
      aria-hidden
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
      aria-hidden
    >
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a17.36 17.36 0 0 1-3.44 4.06M6.6 6.6A17.3 17.3 0 0 0 1 12s4 8 11 8a10.9 10.9 0 0 0 5.1-1.26" />
      <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
