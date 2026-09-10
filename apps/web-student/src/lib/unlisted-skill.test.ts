import { describe, expect, it } from 'vitest';
import { isUnlistedSkillCode, unlistedSkillCode } from './unlisted-skill';

describe('unlistedSkillCode', () => {
  it('prefixes a stable catalog-safe code', () => {
    expect(unlistedSkillCode('GraphQL')).toBe('UL_GRAPHQL');
    expect(isUnlistedSkillCode('UL_GRAPHQL')).toBe(true);
    expect(unlistedSkillCode('  rust / wasm  ').startsWith('UL_')).toBe(true);
  });
});
