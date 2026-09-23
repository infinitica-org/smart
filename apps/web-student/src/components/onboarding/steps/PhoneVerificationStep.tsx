'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'motion/react';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { LightSelect } from '../../ui/LightSelect';
import type { OnboardingProfileForm } from '@/lib/onboarding-form';
import { ErrorBanner, FieldLabel, PrimaryButton, StepHeading, TextInput } from '../wizard-ui';

interface PhoneVerificationStepProps {
  formData: OnboardingProfileForm;
  updateField: <K extends keyof OnboardingProfileForm>(
    field: K,
    value: OnboardingProfileForm[K],
  ) => void;
  onContinue: () => void;
}

const COUNTRY_CODES = [
  { label: '+91 (India)', value: '+91' },
  { label: '+1 (US/Canada)', value: '+1' },
  { label: '+44 (UK)', value: '+44' },
  { label: '+65 (Singapore)', value: '+65' },
  { label: '+61 (Australia)', value: '+61' },
  { label: '+971 (UAE)', value: '+971' },
  { label: '+49 (Germany)', value: '+49' },
];

export default function PhoneVerificationStep({
  formData,
  updateField,
  onContinue,
}: PhoneVerificationStepProps) {
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const phoneInvalid =
    attempted && (!formData.phoneNumber.trim() || !/^\d{10}$/.test(formData.phoneNumber.trim()));
  const otpInvalid = attempted && (!otpCode.trim() || !/^\d{6}$/.test(otpCode.trim()));
  const consentInvalid = attempted && !formData.dpdpConsent;

  const handleSendOrResendCode = () => {
    const cleanPhone = formData.phoneNumber.trim();
    if (!cleanPhone || !/^\d{10}$/.test(cleanPhone)) {
      setError('Please enter a valid 10-digit mobile number before requesting an OTP.');
      setAttempted(true);
      return;
    }
    setError(null);
    setOtpSent(true);
    setCooldown(30);
    setSuccessMessage(
      `A 6-digit verification code was sent to ${formData.phoneCountryCode || '+91'} ${cleanPhone}.`,
    );
  };

  const handleVerify = () => {
    setAttempted(true);
    setError(null);
    setSuccessMessage(null);

    const cleanPhone = formData.phoneNumber.trim();
    if (!cleanPhone || !/^\d{10}$/.test(cleanPhone)) {
      setError('Mobile number must contain exactly 10 digits.');
      return;
    }
    if (!formData.dpdpConsent) {
      setError('You must agree to the DPDP consent terms to proceed.');
      return;
    }
    if (!otpCode.trim() || !/^\d{6}$/.test(otpCode.trim())) {
      setError('Please enter the 6-digit OTP code sent to your phone.');
      return;
    }

    setVerifying(true);
    // Simulate verification check
    setTimeout(() => {
      setVerifying(false);
      onContinue();
    }, 400);
  };

  return (
    <div data-testid="phone-verification-step">
      <StepHeading
        title="Verify your mobile number"
        subtitle="We will send a 6-digit verification code (OTP) to secure your account and send placement updates."
      />

      <AnimatePresence>{error ? <ErrorBanner>{error}</ErrorBanner> : null}</AnimatePresence>

      <AnimatePresence>
        {successMessage ? (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        ) : null}
      </AnimatePresence>

      <div className="space-y-6">
        <div>
          <FieldLabel required>Mobile Number</FieldLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <LightSelect
                value={formData.phoneCountryCode || '+91'}
                onChange={(val) => updateField('phoneCountryCode', val)}
                placeholder="Country code"
                options={COUNTRY_CODES}
              />
            </div>
            <div className="sm:col-span-2">
              <TextInput
                data-testid="phone-number-input"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={formData.phoneNumber}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  updateField('phoneNumber', digits);
                }}
                invalid={phoneInvalid}
                placeholder="9876543210"
                maxLength={10}
              />
            </div>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">Must be a 10-digit number.</p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <FieldLabel required>6-Digit Verification Code</FieldLabel>
            {cooldown > 0 ? (
              <span className="text-xs text-muted-foreground">Resend code in {cooldown}s</span>
            ) : (
              <button
                type="button"
                data-testid="resend-otp-btn"
                onClick={handleSendOrResendCode}
                className="inline-flex items-center gap-1 text-xs font-semibold text-foreground underline underline-offset-2 hover:opacity-80"
              >
                <RefreshCw className="h-3 w-3" />
                {otpSent ? 'Resend code' : 'Get OTP code'}
              </button>
            )}
          </div>
          <TextInput
            data-testid="otp-code-input"
            type="text"
            inputMode="numeric"
            value={otpCode}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
              setOtpCode(digits);
            }}
            invalid={otpInvalid}
            placeholder="123456"
            maxLength={6}
            className="tracking-widest text-lg font-mono"
          />
        </div>

        <label
          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
            consentInvalid ? 'border-rose-500 bg-rose-500/10' : 'border-border bg-card'
          }`}
        >
          <input
            data-testid="dpdp-consent-checkbox"
            type="checkbox"
            checked={formData.dpdpConsent}
            onChange={(e) => updateField('dpdpConsent', e.target.checked)}
            className="mt-0.5 rounded border-border bg-muted text-foreground focus:ring-foreground"
          />
          <span className="text-sm text-foreground">
            I consent to SMART processing my personal data as described in the{' '}
            <Link
              href="/dpdp-policy"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="rounded px-0.5 font-semibold text-foreground underline hover:text-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
            >
              DPDP Act 2023 consent terms
            </Link>
            , so my profile can be shared with prospective employers.
          </span>
        </label>
      </div>

      <div className="mt-10 flex justify-end">
        <PrimaryButton data-testid="verify-phone-submit" onClick={handleVerify} loading={verifying}>
          Verify
        </PrimaryButton>
      </div>
    </div>
  );
}
