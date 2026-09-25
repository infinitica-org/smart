import { api } from './api';

type SearchFn = (query: string) => Promise<{ locations: string[] }>;

/**
 * City/place suggestions from the SMART API's cached location proxy. Returns [] on any failure so the
 * caller falls back to plain free-text entry; a lookup problem never blocks the form.
 */
export async function searchLocations(
  query: string,
  search: SearchFn = (q) => api.employer.searchLocations(q),
): Promise<string[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  try {
    const { locations } = await search(q);
    return [...new Set(locations.filter((name) => name.length > 0))];
  } catch {
    return [];
  }
}
