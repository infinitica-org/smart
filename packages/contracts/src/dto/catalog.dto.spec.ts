import { describe, expect, it } from 'vitest';
import {
  INF_SE_V1_TAXONOMY_VERSION,
  SE_SKILL_DEFINITIONS,
  groupSeSkillsByCategory,
} from '../domain/se-skills.js';
import {
  SKILL_CATEGORY_IDS,
  SKILL_DEFINITIONS,
  SKILL_TAXONOMY_VERSION,
  groupSkillsByCategory,
} from '../domain/skills.js';
import {
  assertInfSeV1MatchesCanonical,
  assertSkillTaxonomyMatchesCanonical,
  buildSeSkillLibraryResponse,
  buildSkillLibraryResponse,
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

describe('skill@1 library (catalog.dto)', () => {
  it('TaxonomySkillCodeSchema rejects legacy INF-05 codes', () => {
    expect(TaxonomySkillCodeSchema.safeParse('GIT_VERSION_CONTROL').success).toBe(false);
    expect(
      TaxonomySkillCodeSchema.safeParse('PYTHON_APPLICATION_BACKEND_DEVELOPMENT').success,
    ).toBe(true);
  });

  it('buildSkillLibraryResponse matches grouped category registry', () => {
    const built = buildSkillLibraryResponse();
    expect(built.taxonomyVersion).toBe(SKILL_TAXONOMY_VERSION);
    expect(built.categories).toHaveLength(SKILL_CATEGORY_IDS.length);
    expect(built.categories.flatMap((category) => category.skills)).toHaveLength(
      SKILL_DEFINITIONS.length,
    );
  });

  it('assertSkillTaxonomyMatchesCanonical rejects drifted skill metadata', () => {
    const built = buildSkillLibraryResponse();
    const tampered = structuredClone(built);
    tampered.categories[0].skills[0].name = 'Tampered skill name';
    expect(() => assertSkillTaxonomyMatchesCanonical(tampered)).toThrow(/drifts from contracts/);
  });

  it('SkillLibraryResponseSchema lists 51 skills in 14 categories', () => {
    const parsed = SkillLibraryResponseSchema.parse(buildSkillLibraryResponse());
    expect(parsed.taxonomyVersion).toBe('skill@1');
    expect(parsed.categories).toHaveLength(14);
    expect(parsed.categories.flatMap((category) => category.skills)).toHaveLength(51);
    expect(groupSkillsByCategory()).toHaveLength(14);
  });
});

describe('inf-se-v1 skill library (catalog.dto)', () => {
  it('SeTaxonomySkillCodeSchema rejects INF-05-only codes', () => {
    expect(SeTaxonomySkillCodeSchema.safeParse('GIT_VERSION_CONTROL').success).toBe(false);
    expect(SeTaxonomySkillCodeSchema.safeParse('SE_JAVA').success).toBe(true);
  });

  it('buildSeSkillLibraryResponse matches grouped category registry', () => {
    const built = buildSeSkillLibraryResponse();
    expect(built.taxonomyVersion).toBe(INF_SE_V1_TAXONOMY_VERSION);
    expect(built.categories).toHaveLength(9);
    expect(built.categories.flatMap((category) => category.skills)).toHaveLength(
      SE_SKILL_DEFINITIONS.length,
    );
  });

  it('assertInfSeV1MatchesCanonical rejects drifted skill metadata', () => {
    const built = buildSeSkillLibraryResponse();
    const tampered = structuredClone(built);
    tampered.categories[0].skills[0].name = 'Tampered skill name';
    expect(() => assertInfSeV1MatchesCanonical(tampered)).toThrow(/drifts from contracts/);
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
  it('snapshotSkillsClaimed freezes codes under the current taxonomy version', () => {
    const snapshot = snapshotSkillsClaimed([
      'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      'SQL_QUERY_OPTIMIZATION',
    ]);
    expect(SkillsClaimedSnapshotSchema.parse(snapshot).taxonomyVersion).toBe('skill@1');
    expect(snapshot.skillCodes).toEqual([
      'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      'SQL_QUERY_OPTIMIZATION',
    ]);
  });

  it('skillsClaimedSnapshotWhenVerified returns null until the row is verified', () => {
    expect(
      skillsClaimedSnapshotWhenVerified('SUBMITTED', ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT']),
    ).toBeNull();
    expect(
      skillsClaimedSnapshotWhenVerified('VERIFIED', ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'])
        ?.skillCodes,
    ).toEqual(['PYTHON_APPLICATION_BACKEND_DEVELOPMENT']);
  });
});

describe('SkillPassThresholdsDtoSchema', () => {
  it('accepts PRD 7.3 beginner vs interview floors', () => {
    const parsed = SkillPassThresholdsDtoSchema.parse({
      BEGINNER: { assessmentPass: 0.6, interviewPass: null, assessmentWeight: 1 },
      INTERMEDIATE: { assessmentPass: 0.6, interviewPass: 0.6, assessmentWeight: 0.4 },
      ADVANCED: { assessmentPass: 0.6, interviewPass: 0.6, assessmentWeight: 0.4 },
      PROFESSIONAL: { assessmentPass: 0.6, interviewPass: 0.6, assessmentWeight: 0.4 },
    });
    expect(parsed.BEGINNER.interviewPass).toBeNull();
    expect(parsed.ADVANCED.assessmentWeight).toBe(0.4);
  });
});

describe('CompetencyDtoSchema passThresholds (optional until catalog seed)', () => {
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
        PROFESSIONAL: { assessmentPass: 0.6, interviewPass: 0.6, assessmentWeight: 0.4 },
      },
    });
    expect(parsed.passThresholds?.BEGINNER.assessmentPass).toBe(0.6);
  });
});
