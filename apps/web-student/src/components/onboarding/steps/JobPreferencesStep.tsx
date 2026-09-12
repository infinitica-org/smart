'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'motion/react';
import { Loader2, MapPin } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import { LightSelect } from '../../ui/LightSelect';
import { CITY_OPTIONS, type OnboardingProfileForm } from '@/lib/onboarding-form';
import { api } from '@/lib/api';
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
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

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

  const resolveCityLabel = (city: string): string => {
    const exact = CITY_OPTIONS.find((option) => option === city);
    if (exact) return exact;
    const lower = city.toLowerCase();
    const match = CITY_OPTIONS.find(
      (option) =>
        option.toLowerCase() === lower ||
        lower.includes(option.toLowerCase()) ||
        option.toLowerCase().includes(lower),
    );
    return match ?? city;
  };

  const handleUseMyLocation = () => {
    setLocationError(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError('Location is not supported in this browser. Please pick a city manually.');
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void (async () => {
          try {
            const { city } = await api.users.reverseGeocode({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
            updatePrefs('currentLocation', resolveCityLabel(city));
          } catch (error) {
            const message = isSmartApiError(error)
              ? error.message
              : 'Could not detect your city. Please pick one manually.';
            setLocationError(message);
          } finally {
            setLocationLoading(false);
          }
        })();
      },
      () => {
        setLocationLoading(false);
        setLocationError('Location permission denied. Please pick a city manually.');
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  };

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
          <span className="inline-flex select-none items-center rounded-l-xl border border-r-0 border-border bg-muted px-3 text-sm text-muted-foreground">
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
          <span className="inline-flex select-none items-center whitespace-nowrap rounded-r-xl border border-l-0 border-border bg-muted px-3 text-sm text-muted-foreground">
            Lakhs Per Annum
          </span>
        </div>
      </div>

      <div className="mb-5">
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <FieldLabel required>Current location</FieldLabel>
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={locationLoading}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#00fad0] hover:text-[#7dffe6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {locationLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <MapPin className="w-3.5 h-3.5" />
            )}
            Use my location
          </button>
        </div>
        <LightSelect
          value={prefs.currentLocation}
          onChange={(val) => updatePrefs('currentLocation', val)}
          placeholder="Select your current city"
          options={CITY_OPTIONS.map((c) => ({ label: c, value: c }))}
        />
        {locationError ? <p className="mt-1 text-xs text-amber-400">{locationError}</p> : null}
        {currentLocationInvalid && (
          <p className="mt-1 text-xs text-rose-400">Current location is required.</p>
        )}
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-1.5">
          <FieldLabel required>Preferred locations</FieldLabel>
          <span className="text-xs text-muted-foreground">
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
          consentInvalid ? 'border-rose-500 bg-rose-50' : 'border-border bg-muted/80'
        }`}
      >
        <input
          type="checkbox"
          checked={formData.dpdpConsent}
          onChange={(e) => updateField('dpdpConsent', e.target.checked)}
          className="mt-0.5 rounded border-border bg-background text-[#00fad0] focus:ring-[#00fad0]"
        />
        <span className="text-sm text-foreground/90">
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
