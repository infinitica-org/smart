import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import JobPreferencesStep from './JobPreferencesStep';
import { emptyOnboardingForm } from '@/lib/onboarding-form';

vi.mock('@/lib/api', () => ({
  api: {
    users: {
      reverseGeocode: vi.fn(),
    },
  },
}));

import { api } from '@/lib/api';

describe('JobPreferencesStep', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders DPDP consent label with a valid hyperlink pointing to /dpdp-policy', () => {
    const formData = emptyOnboardingForm();
    const updateField = vi.fn();
    const onBack = vi.fn();
    const onComplete = vi.fn();

    render(
      <JobPreferencesStep
        formData={formData}
        updateField={updateField}
        onBack={onBack}
        onComplete={onComplete}
        saving={false}
        error={null}
      />,
    );

    const hyperlink = screen.getByRole('link', { name: /DPDP Act 2023 consent terms/i });
    expect(hyperlink).toBeTruthy();
    expect(hyperlink.getAttribute('href')).toBe('/dpdp-policy');
    expect(hyperlink.getAttribute('target')).toBe('_blank');
    expect(hyperlink.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('prefills current location from reverse geocode when geolocation succeeds', async () => {
    vi.mocked(api.users.reverseGeocode).mockResolvedValue({ city: 'Bengaluru' });
    const geolocation = {
      getCurrentPosition: vi.fn((success: PositionCallback) => {
        success({
          coords: { latitude: 12.97, longitude: 77.59 },
        } as GeolocationPosition);
      }),
    };
    vi.stubGlobal('navigator', { geolocation });

    const formData = emptyOnboardingForm();
    const updateField = vi.fn();
    render(
      <JobPreferencesStep
        formData={formData}
        updateField={updateField}
        onBack={vi.fn()}
        onComplete={vi.fn()}
        saving={false}
        error={null}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Use my location/i }));

    await waitFor(() => {
      expect(api.users.reverseGeocode).toHaveBeenCalledWith({ lat: 12.97, lng: 77.59 });
      expect(updateField).toHaveBeenCalledWith('jobPreferences', {
        ...formData.jobPreferences,
        currentLocation: 'Bengaluru',
      });
    });
  });
});
