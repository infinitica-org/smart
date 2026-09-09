import { describe, expect, it } from 'vitest';
import { SKILL_DEFINITIONS, SKILL_TAXONOMY_VERSION } from '../domain/skills.js';
import {
  CompetencyDtoSchema,
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
