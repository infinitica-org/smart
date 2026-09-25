'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { isSmartApiError } from '@smart/api-client';
import { SmartLogo } from '@smart/ui';
import { EyeIcon, EyeOffIcon } from '../../../components/auth-icons';
import { api } from '../../../lib/api';
import { LoginShell } from '../../login/login-shell';

const inputClass =
  'w-full h-11 rounded-[11px] border border-[#e5e7eb] bg-white px-3.5 text-sm text-[#111827] placeholder:text-[#9ca3af] transition-[border-color,box-shadow] duration-150 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10';

const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#6b7280]';

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
        <SmartLogo kind="text" tone="on-light" className="mx-auto h-8 w-auto" title="SMART" />

        <h1 className="mt-8 text-[1.75rem] font-bold leading-tight tracking-tight text-[#111827] sm:text-[2rem]">
          {done ? 'Password reset' : 'Choose a new password'}
        </h1>
        <p className="mt-2.5 text-[15px] leading-relaxed text-[#6b7280]">
          {done
            ? 'Your password has been updated. Sign in with your new password.'
            : 'This also signs you out everywhere else.'}
        </p>

        {done ? (
          <a
            href="/login"
            className="mt-8 flex h-11 w-full items-center justify-center rounded-[11px] bg-black px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 active:scale-[0.98]"
          >
            Back to sign in
          </a>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 w-full space-y-4 text-left">
            {error ? (
              <p
                role="alert"
                className="w-full rounded-[11px] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-left text-sm text-rose-700"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#9ca3af] transition hover:text-[#111827]"
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
              className="mt-2 flex h-11 w-full items-center justify-center rounded-[11px] bg-black px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 active:scale-[0.98] disabled:opacity-60"
            >
              <span>{loading ? 'Saving…' : 'Reset password'}</span>
            </button>
          </form>
        )}
      </section>
    </LoginShell>
  );
}
