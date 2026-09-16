'use client';

import { useEffect, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import { LightSelect } from '@/components/ui/LightSelect';
import { CITY_OPTIONS } from '@/lib/onboarding-form';
import { api } from '@/lib/api';
import { useInvalidateOnboarding, useOnboarding } from '@/lib/use-onboarding';

const MAX_PREFERRED_LOCATIONS = 3;

export function JobPreferencesSection() {
  const { data: onboarding, isLoading, isError } = useOnboarding();
  const invalidateOnboarding = useInvalidateOnboarding();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expectedCtcLakhs, setExpectedCtcLakhs] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    if (!onboarding || saving) return;
    const prefs = onboarding.profile?.jobPreferences ?? onboarding.draft?.jobPreferences;
    if (!prefs) return;
    setExpectedCtcLakhs(prefs.expectedCtcLakhs?.toString() ?? '');
    setCurrentLocation(prefs.currentLocation ?? '');
    setPreferredLocations(prefs.preferredLocations ?? []);
  }, [onboarding, saving]);

  useEffect(() => {
    if (isError) setError('Could not load saved job preferences.');
  }, [isError]);

  const togglePreferredLocation = (city: string) => {
    setPreferredLocations((current) => {
      if (current.includes(city)) return current.filter((entry) => entry !== city);
      if (current.length >= MAX_PREFERRED_LOCATIONS) return current;
      return [...current, city];
    });
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    const expected = Number(expectedCtcLakhs);
    if (!expectedCtcLakhs.trim() || Number.isNaN(expected) || expected <= 0) {
      setError('Expected CTC is required.');
      return;
    }
    if (!currentLocation.trim()) {
      setError('Current location is required.');
      return;
    }
    if (preferredLocations.length === 0) {
      setError('Pick at least one preferred location.');
      return;
    }

    setSaving(true);
    try {
      await api.users.saveOnboarding({
        jobPreferences: {
          expectedCtcLakhs: expected,
          currentLocation: currentLocation.trim(),
          preferredLocations,
          preferredWorkModes: ['FULL_TIME', 'HYBRID'],
        },
      });
      invalidateOnboarding();
      setSuccess('Job preferences saved.');
    } catch (err: unknown) {
      setError(isSmartApiError(err) ? err.message : 'Could not save job preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handleUseMyLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Location is not supported in this browser.');
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
            setCurrentLocation(city);
          } catch (err: unknown) {
            setError(isSmartApiError(err) ? err.message : 'Could not detect your city.');
          } finally {
            setLocationLoading(false);
          }
        })();
      },
      () => {
        setLocationLoading(false);
        setError('Location permission denied.');
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading job preferences…</p>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-medium text-foreground">Job preferences</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Optional matching preferences. These help SMART suggest relevant opportunities later.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      <div className="max-w-sm">
        <label className="mb-2 block text-sm font-medium text-foreground/80">
          Expected CTC (INR lakhs)
        </label>
        <input
          type="number"
          inputMode="decimal"
          value={expectedCtcLakhs}
          onChange={(e) => setExpectedCtcLakhs(e.target.value)}
          placeholder="e.g. 8"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-[#00fad0]"
        />
      </div>

      <div className="max-w-md">
        <label className="mb-2 block text-sm font-medium text-foreground/80">
          Current location
        </label>
        <div className="flex gap-2">
          <LightSelect
            value={currentLocation}
            onChange={setCurrentLocation}
            placeholder="Select city"
            options={CITY_OPTIONS.map((city) => ({ label: city, value: city }))}
          />
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={locationLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground/80 hover:bg-muted"
          >
            {locationLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            Use my location
          </button>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground/80">
          Preferred locations
        </label>
        <div className="flex flex-wrap gap-2">
          {CITY_OPTIONS.map((city) => {
            const selected = preferredLocations.includes(city);
            return (
              <button
                key={city}
                type="button"
                onClick={() => togglePreferredLocation(city)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  selected
                    ? 'border-[#00fad0] bg-[#00fad0]/10 text-[#00fad0]'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {city}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className="rounded-full bg-[#00fad0] px-5 py-2.5 text-sm font-semibold text-[#131313] disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save preferences'}
      </button>
    </div>
  );
}
