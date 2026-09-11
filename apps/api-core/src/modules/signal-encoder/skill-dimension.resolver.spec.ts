import { describe, expect, it } from 'vitest';
import { SkillDimensionResolver } from './skill-dimension.resolver.js';

describe('SkillDimensionResolver anti-gaming caps', () => {
  const resolver = new SkillDimensionResolver();

  it('caps confidence for single-repo language signals', () => {
    const entries = resolver.resolveGithubLanguages([
      {
        language: 'Python',
        bytes: 50_000,
        byteShare: 0.8,
        repoCount: 1,
      },
    ]);
    expect(entries[0]?.confidence).toBeLessThanOrEqual(0.45);
  });

  it('caps confidence when byte-share is extremely concentrated', () => {
    const entries = resolver.resolveGithubLanguages([
      {
        language: 'JavaScript',
        bytes: 90_000,
        byteShare: 0.95,
        repoCount: 4,
      },
    ]);
    expect(entries[0]?.confidence).toBeLessThanOrEqual(0.5);
  });
});
