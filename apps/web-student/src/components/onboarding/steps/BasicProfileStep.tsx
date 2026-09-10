'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { LightSelect } from '../../ui/LightSelect';
import { MONTHS, type OnboardingProfileForm } from '@/lib/onboarding-form';
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
  onContinue: () => void;
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
  onContinue,
}: BasicProfileStepProps) {
  const [tab, setTab] = useState<SubTab>('profile');
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const tabIndex = useMemo(() => SUB_TABS.findIndex((t) => t.id === tab), [tab]);

  const firstNameInvalid = attempted && !formData.firstName.trim();
  const lastNameInvalid = attempted && !formData.lastName.trim();
  const phoneInvalid =
    attempted && (!formData.phoneNumber.trim() || !/^\d{10}$/.test(formData.phoneNumber.trim()));

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
      onContinue();
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

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-8">
        {SUB_TABS.map((t, idx) => {
          const isActive = tab === t.id;
          const isCompleted = idx < tabIndex;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#00fad0] text-black font-bold shadow-md shadow-[#00fad0]/20'
                  : isCompleted
                    ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {isCompleted && !isActive && <CheckCircle2 className="w-3 h-3 text-[#00fad0]" />}
              {t.label}
            </button>
          );
        })}
      </div>

      <StepHeading
        title="Tell us about you"
        subtitle="Basic personal details and phone number to verify your identity."
      />

      <AnimatePresence>{error ? <ErrorBanner>{error}</ErrorBanner> : null}</AnimatePresence>

      <motion.div key={tab} {...stepMotionProps}>
        {tab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
          <div className="max-w-sm">
            <FieldLabel required>Mobile Number</FieldLabel>
            <div className="flex gap-2 items-center">
              <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm font-semibold text-zinc-200 select-none">
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
            <p className="mt-1.5 text-xs text-gray-400">Must be exactly 10 digits.</p>
          </div>
        )}
      </motion.div>

      <div className="mt-10 flex justify-between">
        <BackButton onClick={goBack} />
        <PrimaryButton onClick={goNext}>Continue</PrimaryButton>
      </div>
    </div>
  );
}
