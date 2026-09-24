const ENDPOINT = 'https://nominatim.openstreetmap.org/search';

type FetchLike = (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

/**
 * City/place suggestions from OpenStreetMap Nominatim (public, no key). Returns [] on any failure so
 * the caller falls back to plain free-text entry; a lookup problem never blocks the form.
 */
export async function searchLocations(
  query: string,
  // Third-party public service, not the SMART API, so the api-client (tokens, retries) does not apply.
  // eslint-disable-next-line no-restricted-globals
  fetchFn: FetchLike = (url) => fetch(url, { headers: { Accept: 'application/json' } }),
): Promise<string[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  try {
    const params = new URLSearchParams({ q, format: 'json', limit: '6', addressdetails: '0' });
    const res = await fetchFn(`${ENDPOINT}?${params.toString()}`);
    if (!res.ok) return [];
    const body = await res.json();
    if (!Array.isArray(body)) return [];
    const names = body
      .map((row) =>
        row && typeof row === 'object' ? (row as { display_name?: unknown }).display_name : null,
      )
      .filter((name): name is string => typeof name === 'string' && name.length > 0);
    return [...new Set(names)];
  } catch {
    return [];
  }
}
