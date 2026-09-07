'use client';

import Link from 'next/link';
import { AnimatePresence } from 'motion/react';
import { WORK_MODES } from '@smart/contracts';
import { LightSelect } from '../../ui/LightSelect';
import { CITY_OPTIONS, WORK_MODE_LABELS, type OnboardingProfileForm } from '@/lib/onboarding-form';
import {
  BackButton,
  ErrorBanner,
  FieldLabel,
  PillToggle,
  PrimaryButton,
  StepHeading,
  TextInput,
} from '../wizard-ui';

interface JobPreferencesStepProps {
  formData: OnboardingProfileForm;
  updateField: <K extends keyof OnboardingProfileForm>(
    field: K,
    value: OnboardingProfileForm[K],
  ) => void;
  onBack: () => void;
  onComplete: () => void;
  saving: boolean;
  error: string | null;
}

const MAX_PREFERRED_LOCATIONS = 3;

export default function JobPreferencesStep({
  formData,
  updateField,
  onBack,
  onComplete,
  saving,
  error,
}: JobPreferencesStepProps) {
  const prefs = formData.jobPreferences;
  const updatePrefs = <K extends keyof OnboardingProfileForm['jobPreferences']>(
    field: K,
    value: OnboardingProfileForm['jobPreferences'][K],
  ) => updateField('jobPreferences', { ...prefs, [field]: value });

  const togglePreferredLocation = (city: string) => {
    const exists = prefs.preferredLocations.includes(city);
    if (exists) {
      updatePrefs(
        'preferredLocations',
        prefs.preferredLocations.filter((c) => c !== city),
      );
    } else if (prefs.preferredLocations.length < MAX_PREFERRED_LOCATIONS) {
      updatePrefs('preferredLocations', [...prefs.preferredLocations, city]);
    }
  };

  const toggleWorkMode = (mode: (typeof WORK_MODES)[number]) => {
    const exists = prefs.preferredWorkModes.includes(mode);
    updatePrefs(
      'preferredWorkModes',
      exists
        ? prefs.preferredWorkModes.filter((m) => m !== mode)
        : [...prefs.preferredWorkModes, mode],
    );
  };

  return (
    <div>
      <StepHeading title="Final step" subtitle="Help us match you with the right opportunities." />

      <AnimatePresence>{error ? <ErrorBanner>{error}</ErrorBanner> : null}</AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div>
          <FieldLabel>Current CTC (INR)</FieldLabel>
          <div className="flex">
            <span className="inline-flex items-center px-3 border border-r-0 border-gray-200 rounded-l-xl bg-gray-50 text-gray-400 text-sm">
              ₹
            </span>
            <TextInput
              type="number"
              inputMode="decimal"
              value={prefs.currentCtcLakhs}
              onChange={(e) => updatePrefs('currentCtcLakhs', e.target.value)}
              placeholder="e.g. 5"
              className="rounded-l-none border-l-0"
            />
            <span className="inline-flex items-center px-3 border border-l-0 border-gray-200 rounded-r-xl bg-gray-50 text-gray-500 text-sm whitespace-nowrap">
              Lakhs Per Annum
            </span>
          </div>
        </div>
        <div>
          <FieldLabel required>Expected CTC (INR)</FieldLabel>
          <div className="flex">
            <span className="inline-flex items-center px-3 border border-r-0 border-gray-200 rounded-l-xl bg-gray-50 text-gray-400 text-sm">
              ₹
            </span>
            <TextInput
              type="number"
              inputMode="decimal"
              value={prefs.expectedCtcLakhs}
              onChange={(e) => updatePrefs('expectedCtcLakhs', e.target.value)}
              placeholder="e.g. 8"
              className="rounded-l-none border-l-0"
            />
            <span className="inline-flex items-center px-3 border border-l-0 border-gray-200 rounded-r-xl bg-gray-50 text-gray-500 text-sm whitespace-nowrap">
              Lakhs Per Annum
            </span>
          </div>
        </div>
      </div>

      <div className="mb-5">
        <FieldLabel required>Current location</FieldLabel>
        <LightSelect
          value={prefs.currentLocation}
          onChange={(val) => updatePrefs('currentLocation', val)}
          placeholder="Select your current city"
          options={CITY_OPTIONS.map((c) => ({ label: c, value: c }))}
        />
      </div>

      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <FieldLabel required>Preferred locations</FieldLabel>
          <span className="text-xs text-gray-400">
            {prefs.preferredLocations.length}/{MAX_PREFERRED_LOCATIONS}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {CITY_OPTIONS.map((city) => (
            <PillToggle
              key={city}
              active={prefs.preferredLocations.includes(city)}
              onClick={() => togglePreferredLocation(city)}
            >
              {city}
            </PillToggle>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <FieldLabel required>Preferred mode of work</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {WORK_MODES.map((mode) => (
            <PillToggle
              key={mode}
              active={prefs.preferredWorkModes.includes(mode)}
              onClick={() => toggleWorkMode(mode)}
            >
              {WORK_MODE_LABELS[mode]}
            </PillToggle>
          ))}
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 cursor-pointer mb-8">
        <input
          type="checkbox"
          checked={formData.dpdpConsent}
          onChange={(e) => updateField('dpdpConsent', e.target.checked)}
          className="mt-0.5 rounded border-gray-300"
        />
        <span className="text-sm text-gray-600">
          I consent to SMART processing my personal data as described in the{' '}
          <Link
            href="/dpdp-policy"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-blue-600 underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-0.5"
            aria-label="View DPDP Act 2023 consent terms and data privacy policy sheet"
          >
            DPDP Act 2023 consent terms
          </Link>
          , so my profile can be shared with prospective employers.
        </span>
      </label>

      <div className="flex justify-between">
        <BackButton onClick={onBack} disabled={saving} />
        <PrimaryButton onClick={onComplete} loading={saving}>
          Complete
        </PrimaryButton>
      </div>
    </div>
  );
}
