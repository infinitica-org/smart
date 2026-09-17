import { describe, expect, it } from 'vitest';
import {
  isCompanyVisibleCapability,
  mergeMatchExplainability,
  qlixGapsForVerifiedSkills,
} from './matching-explainability.js';

describe('matching-explainability', () => {
  it('merges rules gaps with QLIX gaps only for verified mapped skills', () => {
    const merged = mergeMatchExplainability(
      {
        strongCompetencies: ['ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION'],
        gapCompetencies: ['SQL_QUERY_OPTIMIZATION'],
        why: 'Strong on algorithms.',
      },
      {
        verifiedSkillCodes: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
        capabilityRows: [],
        qlixProjects: [
          {
            skillCodes: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
            gaps: ['Missing CI pipeline', 'Limited test coverage'],
            smartAssessmentJson: {
              appliedProficiencyCeiling: 'INTERMEDIATE',
              competencyObservations: [
                {
                  competencyId: '828ed14b-2aca-408b-adc1-78e24f22b09d',
                  status: 'DEMONSTRATED',
                  confidence: 'HIGH',
                },
              ],
            },
          },
        ],
      },
    );

    expect(merged.gapCompetencies).toContain('SQL_QUERY_OPTIMIZATION');
    expect(merged.gapCompetencies).toContain('Missing CI pipeline');
    expect(merged.strongCompetencies).toContain('ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION');
    expect(merged.strongCompetencies.some((s) => s.includes('Python syntax'))).toBe(true);
    expect(merged.why).toContain('QLIX project ceiling: INTERMEDIATE');
  });

  it('ignores QLIX gaps when project skill is not verified', () => {
    const gaps = qlixGapsForVerifiedSkills(
      [
        {
          skillCodes: ['JAVA_ENTERPRISE_APPLICATION_DEVELOPMENT'],
          gaps: ['No Dockerfile'],
          smartAssessmentJson: null,
        },
      ],
      new Set(['PYTHON_APPLICATION_BACKEND_DEVELOPMENT']),
    );
    expect(gaps).toEqual([]);
  });

  it('requires assessment verification for company-visible capabilities', () => {
    expect(
      isCompanyVisibleCapability({
        capabilityLabel: 'Build REST APIs',
        skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
        assessmentVerified: false,
        confidenceScore: 0.9,
      }),
    ).toBe(false);
    expect(
      isCompanyVisibleCapability({
        capabilityLabel: 'Build REST APIs',
        skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
        assessmentVerified: true,
        confidenceScore: 0.6,
      }),
    ).toBe(true);
  });
});
