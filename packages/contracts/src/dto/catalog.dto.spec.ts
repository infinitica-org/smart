import { describe, expect, it } from 'vitest';
import {
  INF_SE_V1_TAXONOMY_VERSION,
  SE_SKILL_DEFINITIONS,
  groupSeSkillsByCategory,
} from '../domain/se-skills.js';
import { SKILL_DEFINITIONS, SKILL_TAXONOMY_VERSION } from '../domain/skills.js';
import {
  CompetencyDtoSchema,
  SeSkillLibraryResponseSchema,
  SeTaxonomySkillCodeSchema,
  SkillLibraryResponseSchema,
  SkillPassThresholdsDtoSchema,
  SkillsClaimedSnapshotSchema,
  TaxonomySkillCodeSchema,
  snapshotSkillsClaimed,
  skillsClaimedSnapshotWhenVerified,
} from './catalog.dto.js';

const competencyBase = {
  competencyId: '00000000-0000-4000-8000-000000000001',
  trackCode: 'TECH_FULLSTACK' as const,
  domainCode: 'A' as const,
  name: 'React',
  subDomain: 'Frontend Engineering',
  realWorldWeight: 0.05,
  assessedAtLevels: [1, 2] as const,
};

describe('inf-se-v1 skill library (catalog.dto)', () => {
  it('SeTaxonomySkillCodeSchema rejects INF-05-only codes', () => {
    expect(SeTaxonomySkillCodeSchema.safeParse('GIT_VERSION_CONTROL').success).toBe(false);
    expect(SeTaxonomySkillCodeSchema.safeParse('SE_JAVA').success).toBe(true);
  });

  it('SeSkillLibraryResponseSchema lists 33 skills in 9 categories', () => {
    const parsed = SeSkillLibraryResponseSchema.parse({
      taxonomyVersion: INF_SE_V1_TAXONOMY_VERSION,
      categories: groupSeSkillsByCategory().map((category) => ({
        id: category.id,
        name: category.name,
        skills: category.skills.map((skill) => ({
          code: skill.code,
          name: skill.name,
          categoryId: skill.categoryId,
          categoryName: category.name,
          tagType: skill.tagType,
          competencyBars: skill.competencyBars,
          toolBars: skill.toolBars,
          corroborationEligible: skill.corroborationEligible,
          assessmentRequiredForClaim: skill.assessmentRequiredForClaim,
        })),
      })),
    });
    expect(parsed.taxonomyVersion).toBe('inf-se-v1@1');
    expect(parsed.categories).toHaveLength(9);
    expect(parsed.categories.flatMap((category) => category.skills)).toHaveLength(
      SE_SKILL_DEFINITIONS.length,
    );
  });
});

describe('SK-T01 skill-set library (catalog.dto)', () => {
  it('TaxonomySkillCodeSchema rejects free-text skill names', () => {
    expect(TaxonomySkillCodeSchema.safeParse('TypeScript').success).toBe(false);
    expect(TaxonomySkillCodeSchema.safeParse('GIT_VERSION_CONTROL').success).toBe(true);
  });

  it('SkillLibraryResponseSchema lists every INF-05 skill with version 0.9', () => {
    const parsed = SkillLibraryResponseSchema.parse({
      taxonomyVersion: SKILL_TAXONOMY_VERSION,
      skills: SKILL_DEFINITIONS.map((skill) => ({
        code: skill.code,
        name: skill.name,
        domain: skill.domain,
        stream: skill.stream,
      })),
    });
    expect(parsed.taxonomyVersion).toBe('0.9');
    expect(parsed.skills.length).toBe(SKILL_DEFINITIONS.length);
  });

  it('snapshotSkillsClaimed freezes codes under the current taxonomy version', () => {
    const snapshot = snapshotSkillsClaimed(['GIT_VERSION_CONTROL', 'DATABASE_FUNDAMENTALS']);
    expect(SkillsClaimedSnapshotSchema.parse(snapshot).taxonomyVersion).toBe('0.9');
    expect(snapshot.skillCodes).toEqual(['GIT_VERSION_CONTROL', 'DATABASE_FUNDAMENTALS']);
  });

  it('skillsClaimedSnapshotWhenVerified returns null until the row is verified', () => {
    expect(skillsClaimedSnapshotWhenVerified('SUBMITTED', ['GIT_VERSION_CONTROL'])).toBeNull();
    expect(
      skillsClaimedSnapshotWhenVerified('VERIFIED', ['GIT_VERSION_CONTROL'])?.skillCodes,
    ).toEqual(['GIT_VERSION_CONTROL']);
  });
});

describe('SkillPassThresholdsDtoSchema', () => {
  it('accepts PRD 7.3 beginner vs interview floors', () => {
    const parsed = SkillPassThresholdsDtoSchema.parse({
      BEGINNER: { assessmentPass: 0.6, interviewPass: null, assessmentWeight: 1 },
      INTERMEDIATE: { assessmentPass: 0.6, interviewPass: 0.6, assessmentWeight: 0.4 },
      ADVANCED: { assessmentPass: 0.6, interviewPass: 0.6, assessmentWeight: 0.4 },
    });
    expect(parsed.BEGINNER.interviewPass).toBeNull();
    expect(parsed.ADVANCED.assessmentWeight).toBe(0.4);
  });
});

describe('CompetencyDtoSchema passThresholds (INF-05, optional until catalog seed)', () => {
  it('still parses existing catalog competencies with no passThresholds', () => {
    expect(() => CompetencyDtoSchema.parse(competencyBase)).not.toThrow();
  });

  it('accepts passThresholds when the catalog seed PR supplies them', () => {
    const parsed = CompetencyDtoSchema.parse({
      ...competencyBase,
      passThresholds: {
        BEGINNER: { assessmentPass: 0.6, interviewPass: null, assessmentWeight: 1 },
        INTERMEDIATE: { assessmentPass: 0.6, interviewPass: 0.6, assessmentWeight: 0.4 },
        ADVANCED: { assessmentPass: 0.6, interviewPass: 0.6, assessmentWeight: 0.4 },
      },
    });
    expect(parsed.passThresholds?.BEGINNER.assessmentPass).toBe(0.6);
  });
});
