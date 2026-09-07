'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'motion/react';
import { LightSelect } from '../../ui/LightSelect';
import { CITY_OPTIONS, type OnboardingProfileForm } from '@/lib/onboarding-form';
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
  error: externalError,
}: JobPreferencesStepProps) {
  const [attempted, setAttempted] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

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

  const expectedCtcInvalid = attempted && !prefs.expectedCtcLakhs.trim();
  const currentLocationInvalid = attempted && !prefs.currentLocation.trim();
  const preferredLocationsInvalid = attempted && prefs.preferredLocations.length === 0;
  const consentInvalid = attempted && !formData.dpdpConsent;

  const handleFinish = () => {
    setAttempted(true);
    setLocalError(null);

    if (!prefs.expectedCtcLakhs.trim()) {
      setLocalError('Expected CTC is required.');
      return;
    }
    if (!prefs.currentLocation.trim()) {
      setLocalError('Current location is required.');
      return;
    }
    if (prefs.preferredLocations.length === 0) {
      setLocalError('Pick at least one preferred location.');
      return;
    }
    if (!formData.dpdpConsent) {
      setLocalError('You must agree to data processing consent to complete your profile.');
      return;
    }

    onComplete();
  };

  const displayError = localError || externalError;

  return (
    <div>
      <StepHeading title="Final step" subtitle="Help us match you with the right opportunities." />

      <AnimatePresence>
        {displayError ? <ErrorBanner>{displayError}</ErrorBanner> : null}
      </AnimatePresence>

      <div className="mb-5 max-w-sm">
        <FieldLabel required>Expected CTC (INR)</FieldLabel>
        <div className="flex">
          <span className="inline-flex items-center px-3 border border-r-0 border-zinc-800 rounded-l-xl bg-zinc-900 text-zinc-400 text-sm select-none">
            ₹
          </span>
          <TextInput
            type="number"
            inputMode="decimal"
            value={prefs.expectedCtcLakhs}
            onChange={(e) => updatePrefs('expectedCtcLakhs', e.target.value)}
            placeholder="e.g. 8"
            invalid={expectedCtcInvalid}
            className="rounded-l-none border-l-0"
          />
          <span className="inline-flex items-center px-3 border border-l-0 border-zinc-800 rounded-r-xl bg-zinc-900 text-zinc-400 text-sm whitespace-nowrap select-none">
            Lakhs Per Annum
          </span>
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
        {currentLocationInvalid && (
          <p className="mt-1 text-xs text-rose-400">Current location is required.</p>
        )}
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-1.5">
          <FieldLabel required>Preferred locations</FieldLabel>
          <span className="text-xs text-zinc-400">
            {prefs.preferredLocations.length}/{MAX_PREFERRED_LOCATIONS}
          </span>
        </div>
        <div
          className={`flex flex-wrap gap-2 p-2 rounded-xl border transition-colors ${
            preferredLocationsInvalid ? 'border-rose-500 bg-rose-500/10' : 'border-transparent'
          }`}
        >
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
        {preferredLocationsInvalid && (
          <p className="mt-1 text-xs text-rose-400">Select at least one preferred location.</p>
        )}
      </div>

      <label
        className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer mb-8 transition-colors ${
          consentInvalid ? 'border-rose-500 bg-rose-500/10' : 'border-zinc-800 bg-zinc-900/60'
        }`}
      >
        <input
          type="checkbox"
          checked={formData.dpdpConsent}
          onChange={(e) => updateField('dpdpConsent', e.target.checked)}
          className="mt-0.5 rounded border-zinc-700 bg-zinc-950 text-[#00fad0] focus:ring-[#00fad0]"
        />
        <span className="text-sm text-zinc-300">
          I consent to SMART processing my personal data as described in the{' '}
          <Link
            href="/dpdp-policy"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-[#00fad0] underline hover:text-[#7dffe6] focus:outline-none focus:ring-2 focus:ring-[#00fad0] rounded px-0.5"
            aria-label="View DPDP Act 2023 consent terms and data privacy policy sheet"
          >
            DPDP Act 2023 consent terms
          </Link>
          , so my profile can be shared with prospective employers.
        </span>
      </label>

      <div className="flex justify-between">
        <BackButton onClick={onBack} disabled={saving} />
        <PrimaryButton onClick={handleFinish} loading={saving}>
          Complete Profile
        </PrimaryButton>
      </div>
    </div>
  );
}
