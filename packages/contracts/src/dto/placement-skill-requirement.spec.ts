import { describe, expect, it } from 'vitest';
import { SKILL_DEFINITIONS } from '../domain/skill-taxonomy.js';
import { SkillRequirementSchema } from './placement.dto.js';

describe('SkillRequirementSchema (required skills must come from the catalog)', () => {
  it('accepts every catalog skill at every proficiency', () => {
    for (const skill of SKILL_DEFINITIONS) {
      for (const minProficiency of ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL']) {
        expect(
          SkillRequirementSchema.safeParse({ skillCode: skill.code, minProficiency }).success,
        ).toBe(true);
      }
    }
  });

  it('rejects skills that are not in the catalog', () => {
    for (const skillCode of ['REACT', 'Python', 'random skill', 'NOT_A_SKILL', '']) {
      const result = SkillRequirementSchema.safeParse({ skillCode, minProficiency: 'BEGINNER' });
      expect(result.success).toBe(false);
    }
  });

  it('says why an unknown skill was rejected', () => {
    const result = SkillRequirementSchema.safeParse({
      skillCode: 'REACT',
      minProficiency: 'BEGINNER',
    });
    expect(JSON.stringify(result.error?.issues)).toContain('Unknown taxonomy skill code');
  });

  it('rejects an unknown proficiency', () => {
    expect(
      SkillRequirementSchema.safeParse({
        skillCode: SKILL_DEFINITIONS[0]?.code,
        minProficiency: 'EXPERT',
      }).success,
    ).toBe(false);
  });
});
