import { Inject, Injectable, Logger } from '@nestjs/common';
import { REDIS_TTL_SECONDS } from '@smart/contracts';
import { z } from 'zod';
import { RedisService } from '../../../platform/redis/redis.service.js';

const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';
const FETCH_MS = 4_000;

export class GeocodingNotFoundError extends Error {
  constructor() {
    super('No city found for coordinates');
    this.name = 'GeocodingNotFoundError';
  }
}

const NominatimAddressSchema = z.object({
  city: z.string().optional(),
  town: z.string().optional(),
  village: z.string().optional(),
  municipality: z.string().optional(),
  county: z.string().optional(),
  state: z.string().optional(),
});

const NominatimReverseSchema = z.object({
  address: NominatimAddressSchema,
});

function cityFromAddress(address: z.infer<typeof NominatimAddressSchema>): string | null {
  const candidate =
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    address.county ??
    address.state;
  return candidate?.trim() ? candidate.trim() : null;
}

/** Rounds coords so cache keys avoid storing precise location. */
export function roundedGeocodeKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)}:${lng.toFixed(2)}`;
}

@Injectable()
export class GeocodingApiClient {
  private readonly logger = new Logger(GeocodingApiClient.name);

  constructor(@Inject(RedisService) private readonly redis: RedisService) {}

  async reverseGeocode(lat: number, lng: number): Promise<{ city: string }> {
    const cacheKey = `onboarding:geocode:${roundedGeocodeKey(lat, lng)}`;
    try {
      const hit = await this.redis.get(cacheKey);
      if (hit) return JSON.parse(hit) as { city: string };
    } catch {
      /* cache unavailable — fall through */
    }

    const url = new URL(NOMINATIM_REVERSE);
    url.searchParams.set('format', 'json');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('zoom', '10');
    url.searchParams.set('addressdetails', '1');

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'smart-onboarding/1.0 (contact@infinitica.org)',
      },
      signal: AbortSignal.timeout(FETCH_MS),
    });
    if (!response.ok) throw new Error(`geocode_${String(response.status)}`);

    const body = NominatimReverseSchema.parse(await response.json());
    const city = cityFromAddress(body.address);
    if (!city) throw new GeocodingNotFoundError();

    const value = { city };
    try {
      await this.redis.setex(cacheKey, REDIS_TTL_SECONDS.geocodeReverse, JSON.stringify(value));
    } catch {
      this.logger.debug('Geocode response cache write skipped (Redis unavailable)');
    }
    return value;
  }
}
