'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'motion/react';
import { CheckCircle2, RefreshCw, Zap } from 'lucide-react';
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

const _COUNTRY_CODES = [
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
  const [otpCode, setOtpCode] = useState('123456');
  const [otpSent, setOtpSent] = useState(true);
  const [cooldown, setCooldown] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    'Demo OTP mode active: Use dummy code 123456.',
  );
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Set default dummy phone number if empty
  useEffect(() => {
    if (!formData.phoneNumber.trim()) {
      updateField('phoneNumber', '9876543210');
    }
  }, []);

  const _phoneInvalid =
    attempted && (!formData.phoneNumber.trim() || !/^\d{10}$/.test(formData.phoneNumber.trim()));
  const otpInvalid = attempted && (!otpCode.trim() || !/^\d{6}$/.test(otpCode.trim()));
  const consentInvalid = attempted && !formData.dpdpConsent;

  const handleSendOrResendCode = () => {
    const cleanPhone = formData.phoneNumber.trim() || '9876543210';
    if (!formData.phoneNumber.trim()) {
      updateField('phoneNumber', '9876543210');
    }
    setError(null);
    setOtpSent(true);
    setOtpCode('123456');
    setCooldown(30);
    setSuccessMessage(
      `Demo OTP sent to ${formData.phoneCountryCode || '+91'} ${cleanPhone}. Code auto-filled: 123456.`,
    );
  };

  const handleFillDemoCreds = () => {
    updateField('phoneNumber', '9876543210');
    updateField('dpdpConsent', true);
    setOtpCode('123456');
    setOtpSent(true);
    setError(null);
    setSuccessMessage('Demo student phone number (9876543210) & OTP (123456) filled.');
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
      setError('Please enter the 6-digit OTP code sent to your phone (Use 123456).');
      return;
    }

    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      onContinue();
    }, 300);
  };

  return (
    <div data-testid="phone-verification-step">
      <StepHeading
        title="Create an account"
        subtitle={
          <span>
            Build your skill profile. Get discovered by the right employers.
            <span className="sr-only">Verify your mobile number</span>
          </span>
        }
      />

      <AnimatePresence>{error ? <ErrorBanner>{error}</ErrorBanner> : null}</AnimatePresence>

      <AnimatePresence>
        {successMessage ? (
          <div className="mb-3 flex items-center justify-between rounded-[11px] border border-border bg-muted/60 px-3.5 py-2.5 text-xs sm:text-sm text-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-foreground" />
              <span>{successMessage}</span>
            </div>
            <button
              type="button"
              onClick={handleFillDemoCreds}
              className="inline-flex items-center gap-1 text-xs font-bold text-foreground underline hover:opacity-70"
            >
              <Zap className="h-3.5 w-3.5" />
              Quick Fill Demo
            </button>
          </div>
        ) : null}
      </AnimatePresence>

      <div className="space-y-3.5 sm:space-y-4">
        {/* Mobile Number with Country Code */}
        <div>
          <FieldLabel required>Mobile Number</FieldLabel>
          <div className="flex h-11 rounded-[11px] border border-border bg-background transition-[border-color,box-shadow] duration-150 focus-within:border-black focus-within:ring-2 focus-within:ring-black/10 dark:focus-within:border-white dark:focus-within:ring-white/10">
            <select
              aria-label="Country code"
              value={formData.phoneCountryCode || '+91'}
              onChange={(e) => updateField('phoneCountryCode', e.target.value)}
              className="cursor-pointer rounded-l-[11px] border-r border-border bg-transparent px-3 text-sm font-semibold text-foreground outline-none hover:bg-black/5 dark:hover:bg-white/5"
            >
              <option value="+91">IN +91</option>
              <option value="+1">US +1</option>
              <option value="+44">UK +44</option>
              <option value="+65">SG +65</option>
              <option value="+971">AE +971</option>
              <option value="+61">AU +61</option>
            </select>
            <input
              data-testid="phone-number-input"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={formData.phoneNumber}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                updateField('phoneNumber', digits);
              }}
              placeholder="6381730716"
              maxLength={10}
              className="w-full rounded-r-[11px] bg-transparent px-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Must be a 10-digit number.</p>
        </div>

        {/* 6-Digit OTP */}
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
            className="tracking-widest text-lg font-mono text-center py-2"
          />
        </div>

        {/* DPDP Consent */}
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-[11px] border p-3 sm:p-3.5 transition-colors ${
            consentInvalid ? 'border-rose-500 bg-rose-500/10' : 'border-border bg-card'
          }`}
        >
          <input
            data-testid="dpdp-consent-checkbox"
            type="checkbox"
            checked={formData.dpdpConsent}
            onChange={(e) => updateField('dpdpConsent', e.target.checked)}
            className="mt-0.5 rounded border-border bg-muted text-black focus:ring-black dark:text-white dark:focus:ring-white"
          />
          <span className="text-xs sm:text-[13px] text-foreground leading-snug">
            I consent to SMART processing my personal data as described in the{' '}
            <Link
              href="/dpdp-policy"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="rounded px-0.5 font-semibold text-foreground underline hover:text-black dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-black"
            >
              DPDP Act 2023 consent terms
            </Link>
            , so my profile can be shared with prospective employers.
          </span>
        </label>
      </div>

      <div className="mt-5 sm:mt-6 flex flex-col items-center gap-3">
        <PrimaryButton
          data-testid="verify-phone-submit"
          onClick={handleVerify}
          loading={verifying}
          className="w-full"
        >
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
}
