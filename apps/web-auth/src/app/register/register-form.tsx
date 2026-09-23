'use client';

import { useEffect, useState } from 'react';
import { isSmartApiError } from '@smart/api-client';
import { isDisallowedEndorserEmailDomain } from '@smart/contracts';
import type { SelectableInstitutionDto } from '@smart/contracts';
import { SmartLogo } from '@smart/ui';
import { EyeIcon, EyeOffIcon } from '../../components/auth-icons';
import { api, redirectForRole, storeSession } from '../../lib/api';

const COUNTRY_CODES = [
  { label: 'IN +91', value: '+91' },
  { label: 'US +1', value: '+1' },
  { label: 'UK +44', value: '+44' },
  { label: 'SG +65', value: '+65' },
  { label: 'AE +971', value: '+971' },
  { label: 'AU +61', value: '+61' },
];

export function RegisterForm() {
  const [institutions, setInstitutions] = useState<SelectableInstitutionDto[]>([]);
  const [institutionsError, setInstitutionsError] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [institutionId, setInstitutionId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof api.auth.listInstitutions === 'function') {
      api.auth
        .listInstitutions()
        .then((list) => {
          setInstitutions(list);
          setInstitutionId((current) => current || (list[0]?.id ?? ''));
        })
        .catch(() => setInstitutionsError(true));
    }
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!fullName) {
      setError('Full Name is required.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (isDisallowedEndorserEmailDomain(cleanEmail)) {
      setError(
        'Personal email addresses (e.g. Gmail, Yahoo) are not permitted. Please use your official university email.',
      );
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (confirmPassword && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const registerFn = api.auth.registerStudent ?? api.auth.register;
      const result = await registerFn({
        email: cleanEmail,
        password,
        fullName,
        ...(institutionId ? { institutionId } : {}),
      });
      storeSession(result.accessToken);
      redirectForRole(result.user.role, result.accessToken);
    } catch (err) {
      if (isSmartApiError(err)) {
        if (err.code === 'unregistered_university_domain') {
          setError(
            'Your university domain is not registered on SMART. Please contact your placement administrator.',
          );
        } else if (err.code === 'personal_email_not_allowed') {
          setError(
            'Personal email addresses (e.g. Gmail, Yahoo) are not permitted. Please use your official university email.',
          );
        } else if (err.code === 'conflict') {
          setError('An account with this email already exists.');
        } else {
          setError(
            err.message || 'Could not create your account. Check your details and try again.',
          );
        }
      } else {
        setError('Could not create your account. Check your details and try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh w-full flex-col justify-between bg-white px-6 py-8 text-[#111827] font-sans sm:px-12 sm:py-10">
      {/* Top Header Logo */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <div className="flex items-center gap-3">
          <SmartLogo tone="on-light" className="h-8 w-auto" />
        </div>
      </header>

      {/* Centered Main Form Container */}
      <main className="mx-auto my-auto w-full max-w-[460px] py-6">
        <h1 className="text-3xl font-bold tracking-tight text-[#111827] sm:text-[2.25rem]">
          Create an account
        </h1>
        <p className="mt-2.5 text-[15px] leading-relaxed text-[#6b7280]">
          Build your skill profile. Get discovered by the right employers.
        </p>

        {/* Institution Whitelist Notice */}
        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 text-xs leading-relaxed text-blue-900">
          <strong className="font-semibold">Note for Students:</strong> You must use your official
          partner university email. Personal email accounts (e.g. Gmail) cannot self-create an
          account.
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
          >
            {error}
          </div>
        ) : null}

        {institutionsError ? (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
          >
            Could not load institutions. Refresh the page to try again.
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-6 space-y-5 text-left">
          {/* First Name & Last Name */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="firstName"
                className="mb-1.5 block text-sm font-medium text-[#374151]"
              >
                First name <span className="text-red-500">*</span>
              </label>
              <input
                id="firstName"
                type="text"
                required
                aria-label="Full Name"
                autoComplete="given-name"
                placeholder="Nikhil"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-3 text-sm text-[#111827] placeholder:text-[#9ca3af] transition focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#f0fdf4]"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium text-[#374151]">
                Last name
              </label>
              <input
                id="lastName"
                type="text"
                autoComplete="family-name"
                placeholder="Adam"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-3 text-sm text-[#111827] placeholder:text-[#9ca3af] transition focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#f0fdf4]"
              />
            </div>
          </div>

          {/* Mobile Number */}
          <div>
            <label
              htmlFor="phoneNumber"
              className="mb-1.5 block text-sm font-medium text-[#374151]"
            >
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <div className="flex rounded-lg border border-[#e5e7eb] bg-white transition focus-within:border-[#0f766e] focus-within:ring-2 focus-within:ring-[#f0fdf4]">
              <select
                id="phoneCountryCode"
                aria-label="Country code"
                value={phoneCountryCode}
                onChange={(e) => setPhoneCountryCode(e.target.value)}
                className="cursor-pointer rounded-l-lg border-r border-[#e5e7eb] bg-transparent py-3 pl-3.5 pr-2 text-sm font-medium text-[#374151] outline-none hover:bg-slate-50"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                id="phoneNumber"
                type="tel"
                inputMode="numeric"
                placeholder="6381730716"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="w-full rounded-r-lg px-3.5 py-3 text-sm text-[#111827] placeholder:text-[#9ca3af] outline-none"
              />
            </div>
          </div>

          {/* School Email */}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#374151]">
              School Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              required
              aria-label="School Email"
              autoComplete="email"
              placeholder="student@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-3 text-sm text-[#111827] placeholder:text-[#9ca3af] transition focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#f0fdf4]"
            />
          </div>

          {/* Institution Selector */}
          {institutions.length > 0 ? (
            <div>
              <label
                htmlFor="institution"
                className="mb-1.5 block text-sm font-medium text-[#374151]"
              >
                Institution <span className="text-red-500">*</span>
              </label>
              <select
                id="institution"
                required
                value={institutionId}
                onChange={(e) => setInstitutionId(e.target.value)}
                className="w-full cursor-pointer rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-3 text-sm text-[#111827] outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[#f0fdf4]"
              >
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {/* Password & Confirm Password */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#374151]">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  aria-label="Password"
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Min 8 chars"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-[#e5e7eb] bg-white pl-3.5 pr-10 py-3 text-sm text-[#111827] placeholder:text-[#9ca3af] transition focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#f0fdf4]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#9ca3af] hover:text-[#4b5563]"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium text-[#374151]"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                minLength={8}
                autoComplete="new-password"
                placeholder="Confirm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-3 text-sm text-[#111827] placeholder:text-[#9ca3af] transition focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#f0fdf4]"
              />
            </div>
          </div>

          {/* Primary CTA Button */}
          <button
            type="submit"
            disabled={loading}
            aria-label="Get started"
            className="mt-3 flex w-full items-center justify-center rounded-[11px] bg-black py-3.5 px-6 text-base font-semibold text-white shadow-sm transition-colors hover:bg-neutral-800 active:bg-neutral-900 disabled:opacity-70"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span>Creating account…</span>
              </span>
            ) : (
              'Get started'
            )}
          </button>

          {/* Footer Links */}
          <div className="space-y-2 pt-2 text-center text-sm text-[#6b7280]">
            <div>
              Already have an account?{' '}
              <a href="/login" className="font-semibold text-[#111827] underline hover:text-black">
                Login
              </a>
            </div>
            <div className="text-xs">
              Hiring students?{' '}
              <a
                href="/company/register"
                className="font-semibold text-[#111827] underline hover:text-black"
              >
                Register as an employer
              </a>
            </div>
          </div>
        </form>
      </main>

      {/* Bottom Page Footer */}
      <footer className="mx-auto w-full max-w-5xl py-2 text-left text-xs text-[#9ca3af]">
        © 2026 All Rights Reserved
      </footer>
    </div>
  );
}
