import { Injectable } from '@nestjs/common';

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const MAX_RESULTS = 8;

type FetchLike = (
  url: string,
  init: { headers: Record<string, string>; signal: AbortSignal },
) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

/**
 * Server-side proxy for the public geocoding API. The browser never talks to the third party (so we
 * control the User-Agent and request rate the provider requires) and identical queries are cached.
 * A provider failure returns [] so the form stays usable.
 */
@Injectable()
export class LocationSearchService {
  private readonly cache = new Map<string, { at: number; locations: string[] }>();

  /** Swappable in tests; a field (not a constructor argument) so Nest has nothing to inject. */
  fetchFn: FetchLike = (url, init) => fetch(url, init);

  async search(query: string): Promise<string[]> {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const cached = this.cache.get(q);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.locations;

    try {
      const params = new URLSearchParams({
        q,
        format: 'json',
        limit: String(MAX_RESULTS),
        addressdetails: '0',
      });
      const res = await this.fetchFn(`${ENDPOINT}?${params.toString()}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'SMART-platform/1.0 (company profile)',
        },
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) return [];
      const body = await res.json();
      if (!Array.isArray(body)) return [];
      const locations = [
        ...new Set(
          body
            .map((row) =>
              row && typeof row === 'object'
                ? (row as { display_name?: unknown }).display_name
                : null,
            )
            .filter((name): name is string => typeof name === 'string' && name.length > 0),
        ),
      ];
      if (this.cache.size >= CACHE_MAX_ENTRIES) {
        const oldest = this.cache.keys().next().value;
        if (oldest !== undefined) this.cache.delete(oldest);
      }
      this.cache.set(q, { at: Date.now(), locations });
      return locations;
    } catch {
      return [];
    }
  }
}
