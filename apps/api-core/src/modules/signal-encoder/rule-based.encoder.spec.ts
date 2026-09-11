import { describe, expect, it } from 'vitest';
import { ACTIVE_TAXONOMY_VERSION } from '@smart/contracts';
import { RuleBasedEncoder } from './rule-based.encoder.js';
import { SkillDimensionResolver } from './skill-dimension.resolver.js';

describe('RuleBasedEncoder', () => {
  const encoder = new RuleBasedEncoder(new SkillDimensionResolver());

  it('maps GitHub Python byte-share to PYTHON_R_DATA_ANALYSIS dimension', () => {
    const vector = encoder.encodeGithub({
      userId: '00000000-0000-4000-8000-000000000001',
      languages: [
        {
          language: 'Python',
          bytes: 50_000,
          byteShare: 0.65,
          repoCount: 3,
        },
      ],
      selectedSkillNames: [],
      encodedAt: '2026-09-11T00:00:00.000Z',
    });

    expect(vector.taxonomyVersion).toBe(ACTIVE_TAXONOMY_VERSION);
    expect(vector.sourceId).toBe('GITHUB');
    expect(vector.consentScope).toBe('github.onboarding.public_repos');
    expect(vector.fetchedAt).toBe('2026-09-11T00:00:00.000Z');
    const python = vector.entries.find(
      (e) => e.dimension.dimensionKey === 'PYTHON_R_DATA_ANALYSIS',
    );
    expect(python?.score).toBeCloseTo(0.585, 2);
    expect(python?.confidence).toBeGreaterThan(0.5);
  });

  it('returns empty entries for unmapped HackerRank stub', () => {
    const vector = encoder.encodeStub('HACKERRANK', '00000000-0000-4000-8000-000000000002');
    expect(vector.entries).toHaveLength(0);
    expect(vector.sourceId).toBe('HACKERRANK');
  });
});
