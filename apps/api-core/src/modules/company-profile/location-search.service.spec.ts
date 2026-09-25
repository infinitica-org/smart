import { describe, expect, it, vi } from 'vitest';
import { LocationSearchService } from './location-search.service.js';

const ok = (rows: unknown) => ({ ok: true, json: async () => rows });

describe('LocationSearchService (Th6-350)', () => {
  it('returns unique display names and caches identical queries', async () => {
    const service = new LocationSearchService();
    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        ok([{ display_name: 'Pune, India' }, { display_name: 'Pune, India' }, { nope: 1 }]),
      );
    service.fetchFn = fetchFn;
    expect(await service.search('Pune')).toEqual(['Pune, India']);
    expect(await service.search('  pune ')).toEqual(['Pune, India']);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0]?.[1].headers['User-Agent']).toContain('SMART');
  });

  it('returns [] for short queries without calling the provider', async () => {
    const service = new LocationSearchService();
    service.fetchFn = vi.fn();
    expect(await service.search('p')).toEqual([]);
    expect(service.fetchFn).not.toHaveBeenCalled();
  });

  it('returns [] and does not cache when the provider fails', async () => {
    const service = new LocationSearchService();
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce(ok([{ display_name: 'Chennai, India' }]));
    service.fetchFn = fetchFn;
    expect(await service.search('chennai')).toEqual([]);
    expect(await service.search('chennai')).toEqual(['Chennai, India']);
  });
});
