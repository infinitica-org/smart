import { SKILL_DEFINITIONS } from '@smart/contracts';
import { SkillRequirementSchema } from '@smart/contracts';
import { describe, expect, it } from 'vitest';
import {
  fromRequiredSkills,
  isCatalogSkill,
  levelToProficiency,
  proficiencyToLevel,
  SKILL_CATALOG_GROUPS,
  skillNameForCode,
  toRequiredSkills,
  type SkillReq,
} from './skill-catalog';

function need<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('expected a value');
  return value;
}

describe('skill catalog', () => {
  it('offers every platform skill exactly once, grouped by category', () => {
    const offered = SKILL_CATALOG_GROUPS.flatMap((group) =>
      group.skills.map((skill) => skill.code),
    );
    expect(offered).toHaveLength(SKILL_DEFINITIONS.length);
    expect(new Set(offered).size).toBe(offered.length);
    expect(new Set(offered)).toEqual(new Set(SKILL_DEFINITIONS.map((skill) => skill.code)));
  });

  it('sorts skills by name within each category', () => {
    for (const group of SKILL_CATALOG_GROUPS) {
      const names = group.skills.map((skill) => skill.name);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    }
  });

  it('recognises catalog codes and rejects anything else', () => {
    expect(isCatalogSkill(need(SKILL_DEFINITIONS[0]).code)).toBe(true);
    for (const bad of ['REACT', 'random skill', '', 'python']) {
      expect(isCatalogSkill(bad)).toBe(false);
    }
  });

  it('shows the catalog name for a code and falls back to the code for an unknown one', () => {
    const first = need(SKILL_DEFINITIONS[0]);
    expect(skillNameForCode(first.code)).toBe(first.name);
    expect(skillNameForCode('NOT_A_SKILL')).toBe('NOT_A_SKILL');
  });
});

describe('required skills mapping', () => {
  const first = need(SKILL_DEFINITIONS[0]);

  it('sends the real catalog code, never a code derived from typed text', () => {
    const skills: SkillReq[] = [{ code: first.code, name: first.name, level: 'Advanced' }];
    expect(toRequiredSkills(skills)).toEqual([
      { skillCode: first.code, minProficiency: 'ADVANCED' },
    ]);
  });

  it('produces payloads the API contract accepts, for every level and every catalog skill', () => {
    for (const definition of SKILL_DEFINITIONS) {
      for (const level of ['Beginner', 'Intermediate', 'Advanced', 'Professional'] as const) {
        const [row] = toRequiredSkills([{ code: definition.code, name: definition.name, level }]);
        expect(SkillRequirementSchema.safeParse(row).success).toBe(true);
      }
    }
  });

  it('would have been rejected before: a free-text name becomes an invalid code', () => {
    const legacyCode = 'React'.toUpperCase().replace(/\s+/g, '_');
    expect(
      SkillRequirementSchema.safeParse({ skillCode: legacyCode, minProficiency: 'BEGINNER' })
        .success,
    ).toBe(false);
  });

  it('maps levels both ways', () => {
    expect(levelToProficiency('Beginner')).toBe('BEGINNER');
    expect(levelToProficiency('Professional')).toBe('PROFESSIONAL');
    expect(proficiencyToLevel('ADVANCED')).toBe('Advanced');
    expect(proficiencyToLevel('PROFICIENT')).toBe('Intermediate');
    expect(proficiencyToLevel('SOMETHING_ELSE')).toBe('Intermediate');
  });

  it('rebuilds editor state from a saved opening with catalog names', () => {
    const skills = fromRequiredSkills([{ skillCode: first.code, minProficiency: 'PROFESSIONAL' }]);
    expect(skills).toEqual([{ code: first.code, name: first.name, level: 'Professional' }]);
  });

  it('handles an opening with no saved skills', () => {
    expect(fromRequiredSkills(undefined)).toEqual([]);
    expect(fromRequiredSkills([])).toEqual([]);
  });

  it('round-trips a saved opening without changing it', () => {
    const saved = [
      { skillCode: first.code, minProficiency: 'INTERMEDIATE' },
      { skillCode: need(SKILL_DEFINITIONS[1]).code, minProficiency: 'ADVANCED' },
    ];
    expect(toRequiredSkills(fromRequiredSkills(saved))).toEqual(saved);
  });
});
