import { describe, expect, it } from 'vitest';
import { CompetencyDtoSchema, SkillPassThresholdsDtoSchema } from './catalog.dto.js';

const competencyBase = {
  competencyId: '00000000-0000-4000-8000-000000000001',
  trackCode: 'TECH_FULLSTACK' as const,
  domainCode: 'A' as const,
  name: 'React',
  subDomain: 'Frontend Engineering',
  realWorldWeight: 0.05,
  assessedAtLevels: [1, 2] as const,
};

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
