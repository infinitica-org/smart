import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { GeocodingNotFoundError } from './geocoding-api.client.js';
import { GeocodingOnboardingService } from './geocoding-onboarding.service.js';

describe('GeocodingOnboardingService', () => {
  it('returns city on success', async () => {
    const geocoding = {
      reverseGeocode: vi.fn().mockResolvedValue({ city: 'Chennai' }),
    };
    const service = new GeocodingOnboardingService(geocoding as never);
    await expect(service.reverseGeocode(13.08, 80.27)).resolves.toEqual({ city: 'Chennai' });
  });

  it('maps missing city to 404', async () => {
    const geocoding = {
      reverseGeocode: vi.fn().mockRejectedValue(new GeocodingNotFoundError()),
    };
    const service = new GeocodingOnboardingService(geocoding as never);
    await expect(service.reverseGeocode(0, 0)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps provider failures to 503', async () => {
    const geocoding = {
      reverseGeocode: vi.fn().mockRejectedValue(new Error('geocode_503')),
    };
    const service = new GeocodingOnboardingService(geocoding as never);
    await expect(service.reverseGeocode(12, 77)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
