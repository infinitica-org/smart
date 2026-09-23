'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { isSmartApiError } from '@smart/api-client';
import { SmartLogo } from '@smart/ui';
import { ArrowUpRightIcon, EyeIcon, EyeOffIcon } from '../../../components/auth-icons';
import { api } from '../../../lib/api';
import { LoginShell } from '../../login/login-shell';

const inputClass =
  'w-full rounded-lg border border-[#e2e8f0] bg-white px-4 py-3.5 text-[15px] text-[#172033] placeholder:text-[#94a3b8] transition-[border-color,box-shadow] focus:border-[#0f9f8f] focus:outline-none focus:ring-2 focus:ring-[#ecfdf5]';

const labelClass = 'mb-2 block text-[13px] font-medium tracking-[-0.01em] text-[#64748b]';

export default function ResetPasswordPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.auth.confirmPasswordReset(token, { newPassword: password });
      setDone(true);
    } catch (err) {
      setError(
        isSmartApiError(err) && (err.code === 'not_found' || err.code === 'conflict')
          ? 'This reset link is invalid or has expired. Request a new one.'
          : 'Could not reset your password. Try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginShell>
      <section className="flex w-full max-w-[420px] flex-col items-center text-center">
        <SmartLogo kind="mark" tone="on-light" className="mx-auto size-11" title="SMART" />

        <h1 className="mt-10 text-[2.5rem] font-semibold leading-tight tracking-[-0.03em] text-[#172033] sm:text-[2.875rem]">
          {done ? 'Password reset' : 'Choose a new password'}
        </h1>
        <p className="mt-3 text-[17px] leading-relaxed tracking-[-0.01em] text-[#64748b] sm:text-lg">
          {done
            ? 'Your password has been updated. Sign in with your new password.'
            : 'This also signs you out everywhere else.'}
        </p>

        {done ? (
          <a
            href="/login"
            className="mt-8 flex w-full items-center justify-center rounded-lg bg-[#172033] px-5 py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#0f172a]"
          >
            Back to sign in
          </a>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 w-full space-y-5 text-left">
            {error ? (
              <p
                role="alert"
                className="w-full rounded-lg border border-[#f3c8cc] bg-[#fff1f2] px-4 py-3 text-left text-sm text-[#c24141]"
              >
                {error}
              </p>
            ) : null}

            <div>
              <label htmlFor="password" className={labelClass}>
                New password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
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

            <div>
              <label htmlFor="confirmPassword" className={labelClass}>
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-between rounded-lg bg-[#172033] px-5 py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#0f172a] disabled:opacity-70"
            >
              <span>{loading ? 'Saving…' : 'Reset password'}</span>
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <ArrowUpRightIcon />
              )}
            </button>
          </form>
        )}
      </section>
    </LoginShell>
  );
}
