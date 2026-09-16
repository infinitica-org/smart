import { describe, expect, it } from 'vitest';
import { tierFromEvents } from './credential-verified-fusion.consumer.js';

describe('tierFromEvents', () => {
  it('returns null when there are no events', () => {
    expect(tierFromEvents([])).toBeNull();
  });

  it('returns null when no event metadata carries a recognized tier', () => {
    expect(tierFromEvents([{ metadata: null }, { metadata: { reason: 'endorsed' } }])).toBeNull();
  });

  it('returns the tier from the first event (most recent) that carries one', () => {
    expect(
      tierFromEvents([
        { metadata: { note: 'endorsement decision, no tier' } },
        { metadata: { tier: 'TIER_2_PUBLIC_URL', resultStatus: 'VERIFIED' } },
      ]),
    ).toBe('TIER_2_PUBLIC_URL');
  });

  it('ignores an unrecognized tier string', () => {
    expect(tierFromEvents([{ metadata: { tier: 'TIER_9_MADE_UP' } }])).toBeNull();
  });
});
