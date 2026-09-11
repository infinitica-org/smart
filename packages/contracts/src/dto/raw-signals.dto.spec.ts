import { describe, expect, it } from 'vitest';
import { RawSignalEnvelopeSchema } from './raw-signals.dto.js';

describe('RawSignalEnvelopeSchema', () => {
  it('accepts a HackerRank envelope with consentScope', () => {
    const parsed = RawSignalEnvelopeSchema.parse({
      userId: '00000000-0000-4000-8000-000000000001',
      sourceId: 'HACKERRANK',
      externalAccountId: 'ada_hr',
      fetchedAt: '2026-09-11T00:00:00.000Z',
      consentScope: 'hackerrank.profile.public',
      taxonomyVersion: 'inf-05@3',
      payload: {
        sourceId: 'HACKERRANK',
        badges: [{ name: 'Python', level: 'gold' }],
        solvedByTag: [{ tag: 'Python', count: 5, difficulty: 'UNKNOWN' }],
      },
    });
    expect(parsed.payload.sourceId).toBe('HACKERRANK');
  });
});
