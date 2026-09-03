import { describe, expect, it } from 'vitest';
import { bandForScore, integrityScore } from './risk.js';

describe('proctoring risk', () => {
  it('bands CLEAN under 6', () => {
    expect(bandForScore(integrityScore([{ kind: 'LOOKING_AWAY', severity: 'low', ts: 1 }]))).toBe(
      'CLEAN',
    );
  });

  it('adds a burst bonus for three events in 60s', () => {
    const score = integrityScore([
      { kind: 'TAB_BLUR', severity: 'medium', ts: 0 },
      { kind: 'FULLSCREEN_EXIT', severity: 'medium', ts: 1000 },
      { kind: 'COPY_ATTEMPT', severity: 'medium', ts: 2000 },
    ]);
    expect(score).toBeGreaterThanOrEqual(13);
  });
});
