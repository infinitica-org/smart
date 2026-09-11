import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  GeocodingApiClient,
  GeocodingNotFoundError,
  roundedGeocodeKey,
} from './geocoding-api.client.js';

describe('GeocodingApiClient', () => {
  const redis = {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
  };

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          address: { city: 'Bengaluru', state: 'Karnataka' },
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('rounds coordinates for cache keys', () => {
    expect(roundedGeocodeKey(12.345678, 77.654321)).toBe('12.35:77.65');
  });

  it('returns a city from Nominatim reverse geocode', async () => {
    const client = new GeocodingApiClient(redis as never);
    await expect(client.reverseGeocode(12.97, 77.59)).resolves.toEqual({ city: 'Bengaluru' });
    expect(fetch).toHaveBeenCalled();
    expect(redis.setex).toHaveBeenCalled();
  });

  it('throws when no city can be resolved', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ address: {} }),
      }),
    );
    const client = new GeocodingApiClient(redis as never);
    await expect(client.reverseGeocode(0, 0)).rejects.toBeInstanceOf(GeocodingNotFoundError);
  });
});
