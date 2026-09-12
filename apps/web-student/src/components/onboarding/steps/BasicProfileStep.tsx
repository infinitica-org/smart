'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { LightSelect } from '../../ui/LightSelect';
import { MONTHS, type OnboardingProfileForm } from '@/lib/onboarding-form';
import { ProfilePhotoPicker } from '../ProfilePhotoPicker';
import {
  BackButton,
  ErrorBanner,
  FieldLabel,
  PrimaryButton,
  StepHeading,
  TextInput,
  stepMotionProps,
} from '../wizard-ui';

interface BasicProfileStepProps {
  formData: OnboardingProfileForm;
  updateField: <K extends keyof OnboardingProfileForm>(
    field: K,
    value: OnboardingProfileForm[K],
  ) => void;
  onBack: () => void;
  onComplete: () => void;
  saving: boolean;
  completeError: string | null;
}

type SubTab = 'profile' | 'phone';
const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'phone', label: 'Phone' },
];

const DAYS = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
const YEARS = Array.from({ length: 100 }, (_, i) => (new Date().getFullYear() - i).toString());

export default function BasicProfileStep({
  formData,
  updateField,
  onBack,
  onComplete,
  saving,
  completeError,
}: BasicProfileStepProps) {
  const [tab, setTab] = useState<SubTab>('profile');
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const tabIndex = useMemo(() => SUB_TABS.findIndex((t) => t.id === tab), [tab]);

  const firstNameInvalid = attempted && !formData.firstName.trim();
  const lastNameInvalid = attempted && !formData.lastName.trim();
  const phoneInvalid =
    attempted && (!formData.phoneNumber.trim() || !/^\d{10}$/.test(formData.phoneNumber.trim()));
  const consentInvalid = attempted && !formData.dpdpConsent;

  const goNext = () => {
    setAttempted(true);
    setError(null);

    if (tab === 'profile') {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        setError('First Name and Last Name are required.');
        return;
      }
      setAttempted(false);
      setTab('phone');
      return;
    }

    if (tab === 'phone') {
      const cleanPhone = formData.phoneNumber.trim();
      if (!cleanPhone) {
        setError('Mobile number is required.');
        return;
      }
      if (!/^\d{10}$/.test(cleanPhone)) {
        setError('Mobile number must contain exactly 10 digits.');
        return;
      }
      if (!formData.dpdpConsent) {
        setError('You must agree to the DPDP consent terms to enter SMART.');
        return;
      }
      onComplete();
    }
  };

  const goBack = () => {
    setError(null);
    setAttempted(false);
    const previousTab = SUB_TABS[tabIndex - 1];
    if (previousTab) {
      setTab(previousTab.id);
    } else {
      onBack();
    }
  };

  const bannerError = error ?? completeError;

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-1.5">
        {SUB_TABS.map((t, idx) => {
          const isActive = tab === t.id;
          const isCompleted = idx < tabIndex;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[#00fad0] font-bold text-black shadow-md shadow-[#00fad0]/20'
                  : isCompleted
                    ? 'bg-muted text-foreground hover:bg-muted/80'
                    : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isCompleted && !isActive && <CheckCircle2 className="h-3 w-3 text-[#00fad0]" />}
              {t.label}
            </button>
          );
        })}
      </div>

      <StepHeading
        title="Let's set up your profile"
        subtitle="Just the basics so we know who you are. You can add skills, experience, and more from your dashboard later."
      />

      <AnimatePresence>
        {bannerError ? <ErrorBanner>{bannerError}</ErrorBanner> : null}
      </AnimatePresence>

      <motion.div key={tab} {...stepMotionProps}>
        {tab === 'profile' && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ProfilePhotoPicker
              fullName={`${formData.firstName} ${formData.lastName}`.trim()}
              profilePhotoUrl={formData.profilePhotoUrl}
              onPhotoChange={(url) => updateField('profilePhotoUrl', url)}
            />
            <div>
              <FieldLabel required>First Name</FieldLabel>
              <TextInput
                value={formData.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                autoComplete="given-name"
                invalid={firstNameInvalid}
                placeholder="First name"
              />
            </div>
            <div>
              <FieldLabel required>Last Name</FieldLabel>
              <TextInput
                value={formData.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                autoComplete="family-name"
                invalid={lastNameInvalid}
                placeholder="Last name"
              />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Gender</FieldLabel>
              <LightSelect
                value={formData.gender}
                onChange={(val) => updateField('gender', val)}
                placeholder="Select gender"
                options={[
                  { label: 'Male', value: 'Male' },
                  { label: 'Female', value: 'Female' },
                  { label: 'Non-binary', value: 'Non-binary' },
                  { label: 'Prefer not to say', value: 'Prefer not to say' },
                ]}
              />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Date of Birth</FieldLabel>
              <div className="grid grid-cols-3 gap-3">
                <LightSelect
                  value={formData.dobMonth}
                  onChange={(val) => updateField('dobMonth', val)}
                  placeholder="Month"
                  options={MONTHS.map((m) => ({ label: m, value: m }))}
                />
                <LightSelect
                  value={formData.dobDay}
                  onChange={(val) => updateField('dobDay', val)}
                  placeholder="Day"
                  options={DAYS.map((d) => ({ label: d, value: d }))}
                />
                <LightSelect
                  value={formData.dobYear}
                  onChange={(val) => updateField('dobYear', val)}
                  placeholder="Year"
                  options={YEARS.map((y) => ({ label: y, value: y }))}
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'phone' && (
          <div>
            <div className="max-w-sm">
              <FieldLabel required>Mobile Number</FieldLabel>
              <div className="flex items-center gap-2">
                <div className="flex h-12 w-20 shrink-0 select-none items-center justify-center rounded-xl border border-border bg-muted px-3 text-sm font-semibold text-foreground">
                  +91
                </div>
                <TextInput
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={formData.phoneNumber}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    updateField('phoneNumber', digits);
                    updateField('phoneCountryCode', '+91');
                  }}
                  invalid={phoneInvalid}
                  placeholder="9876543210"
                  maxLength={10}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">Must be exactly 10 digits.</p>
            </div>

            <label
              className={`mt-8 flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                consentInvalid ? 'border-rose-500 bg-rose-500/10' : 'border-border bg-card'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.dpdpConsent}
                onChange={(e) => updateField('dpdpConsent', e.target.checked)}
                className="mt-0.5 rounded border-border bg-muted text-[#00fad0] focus:ring-[#00fad0]"
              />
              <span className="text-sm text-foreground">
                I consent to SMART processing my personal data as described in the{' '}
                <Link
                  href="/dpdp-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="rounded px-0.5 font-semibold text-[#00fad0] underline hover:text-[#7dffe6] focus:outline-none focus:ring-2 focus:ring-[#00fad0]"
                  aria-label="View DPDP Act 2023 consent terms and data privacy policy sheet"
                >
                  DPDP Act 2023 consent terms
                </Link>
                , so my profile can be shared with prospective employers.
              </span>
            </label>
          </div>
        )}
      </motion.div>

      <div className="mt-10 flex justify-between">
        <BackButton onClick={goBack} disabled={saving} />
        <PrimaryButton onClick={goNext} loading={saving && tab === 'phone'}>
          {tab === 'phone' ? 'Enter SMART' : 'Continue'}
        </PrimaryButton>
      </div>
    </div>
  );
}
