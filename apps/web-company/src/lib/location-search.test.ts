import { describe, expect, it } from 'vitest';
import { searchLocations } from './location-search';

const ok = (body: unknown) => async () => ({ ok: true, json: async () => body });

describe('searchLocations', () => {
  it('returns distinct place names', async () => {
    const out = await searchLocations(
      'pune',
      ok([
        { display_name: 'Pune, Maharashtra, India' },
        { display_name: 'Pune, Maharashtra, India' },
        {},
      ]),
    );
    expect(out).toEqual(['Pune, Maharashtra, India']);
  });

  it('skips the lookup for very short input', async () => {
    let called = false;
    const out = await searchLocations('pu', async () => {
      called = true;
      return { ok: true, json: async () => [] };
    });
    expect(out).toEqual([]);
    expect(called).toBe(false);
  });

  it('falls back to no suggestions when the service fails', async () => {
    expect(await searchLocations('pune', async () => Promise.reject(new Error('offline')))).toEqual(
      [],
    );
    expect(
      await searchLocations('pune', async () => ({ ok: false, json: async () => [] })),
    ).toEqual([]);
    expect(await searchLocations('pune', ok({ not: 'an array' }))).toEqual([]);
  });
});
