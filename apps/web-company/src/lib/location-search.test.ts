import { describe, expect, it } from 'vitest';
import { searchLocations } from './location-search';

const ok = (locations: string[]) => async () => ({ locations });

describe('searchLocations', () => {
  it('returns distinct place names from the server proxy', async () => {
    const out = await searchLocations(
      'pune',
      ok(['Pune, Maharashtra, India', 'Pune, Maharashtra, India', '']),
    );
    expect(out).toEqual(['Pune, Maharashtra, India']);
  });

  it('skips the lookup for very short input', async () => {
    let called = false;
    const out = await searchLocations('pu', async () => {
      called = true;
      return { locations: [] };
    });
    expect(out).toEqual([]);
    expect(called).toBe(false);
  });

  it('falls back to no suggestions when the lookup fails', async () => {
    const out = await searchLocations('pune', async () => {
      throw new Error('down');
    });
    expect(out).toEqual([]);
  });
});
