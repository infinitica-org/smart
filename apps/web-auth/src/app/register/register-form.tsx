'use client';

import { useEffect, useState } from 'react';
import { isSmartApiError } from '@smart/api-client';
import { SmartLogo } from '@smart/ui';
import type { SelectableInstitutionDto } from '@smart/contracts';
import { ArrowUpRightIcon, EyeIcon, EyeOffIcon } from '../../components/auth-icons';
import { api, redirectForRole, storeSession } from '../../lib/api';

const inputClass =
  'w-full rounded-lg border border-[#e2e8f0] bg-white px-4 py-3.5 text-[15px] text-[#172033] placeholder:text-[#94a3b8] transition-[border-color,box-shadow] focus:border-[#0f9f8f] focus:outline-none focus:ring-2 focus:ring-[#ecfdf5] disabled:opacity-60';

const labelClass = 'mb-2 block text-[13px] font-medium tracking-[-0.01em] text-[#64748b]';

export function RegisterForm() {
  const [institutions, setInstitutions] = useState<SelectableInstitutionDto[]>([]);
  const [institutionsError, setInstitutionsError] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [institutionId, setInstitutionId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.auth
      .listInstitutions()
      .then((list) => {
        setInstitutions(list);
        setInstitutionId((current) => current || (list[0]?.id ?? ''));
      })
      .catch(() => setInstitutionsError(true));
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!institutionId) {
      setError('Select your institution.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.auth.register({ email, password, fullName, institutionId });
      storeSession(result.accessToken);
      redirectForRole(result.user.role, result.accessToken);
    } catch (err) {
      setError(
        isSmartApiError(err) && err.code === 'conflict'
          ? 'An account with this email already exists.'
          : 'Could not create your account. Check your details and try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex w-full max-w-[420px] flex-col items-center text-center">
      <SmartLogo kind="mark" tone="on-light" className="mx-auto size-11" title="SMART" />

      <h1 className="mt-10 text-[2.5rem] font-semibold leading-tight tracking-[-0.03em] text-[#172033] sm:text-[2.875rem]">
        Create your account
      </h1>
      <p className="mt-3 text-[17px] leading-relaxed tracking-[-0.01em] text-[#64748b] sm:text-lg">
        Join SMART as a student.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-6 w-full rounded-lg border border-[#f3c8cc] bg-[#fff1f2] px-4 py-3 text-left text-sm text-[#c24141]"
        >
          {error}
        </p>
      ) : null}
      {institutionsError ? (
        <p
          role="alert"
          className="mt-6 w-full rounded-lg border border-[#f3c8cc] bg-[#fff1f2] px-4 py-3 text-left text-sm text-[#c24141]"
        >
          Could not load institutions. Refresh the page to try again.
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-8 w-full space-y-5 text-left">
        <div>
          <label htmlFor="fullName" className={labelClass}>
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
          />
        </div>

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
          <label htmlFor="institution" className={labelClass}>
            Institution
          </label>
          <select
            id="institution"
            required
            value={institutionId}
            onChange={(e) => setInstitutionId(e.target.value)}
            disabled={institutions.length === 0}
            className={inputClass}
          >
            {institutions.length === 0 ? <option value="">Loading institutions…</option> : null}
            {institutions.map((institution) => (
              <option key={institution.id} value={institution.id}>
                {institution.name}
              </option>
            ))}
          </select>
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
            Confirm password
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
          <span>{loading ? 'Creating account…' : 'Create account'}</span>
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <ArrowUpRightIcon />
          )}
        </button>

        <div className="flex justify-center pt-1">
          <a
            href="/login"
            className="text-[13px] font-medium text-[#172033] underline-offset-4 transition hover:underline"
          >
            Already have an account? Sign in
          </a>
        </div>
      </form>
    </section>
  );
}
