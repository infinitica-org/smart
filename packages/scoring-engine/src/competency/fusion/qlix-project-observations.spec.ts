import { describe, expect, it } from 'vitest';
import type { ProjectVerificationReportDto, SkillCompetency } from '@smart/contracts';
import {
  mergeProjectObservationBundles,
  normalizeQlixCompetencyStatus,
  projectBundleFromQlixEvidence,
} from './qlix-project-observations.js';
import { projectToObservationBundle } from './source-adapters/project.adapter.js';

const COMP_A = 'aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee';
const COMP_B = 'bbbbbbbb-cccc-4ddd-aeee-ffffffffffff';

const MODEL: SkillCompetency[] = [
  {
    competencyId: COMP_A,
    skillCode: 'SQL_QUERY_OPTIMIZATION',
    capability: 'Writes efficient queries',
    role: 'critical',
    difficulty: 'INTERMEDIATE',
  },
  {
    competencyId: COMP_B,
    skillCode: 'SQL_QUERY_OPTIMIZATION',
    capability: 'Indexes appropriately',
    role: 'supporting',
    difficulty: 'BEGINNER',
  },
];

function report(confidence = 0.9): ProjectVerificationReportDto {
  return {
    reportId: '11111111-1111-4111-8111-111111111111',
    projectId: '22222222-2222-4222-8222-222222222222',
    score: 80,
    relevanceScore: 75,
    qualityScore: 70,
    duplicateScore: 5,
    confidence,
    plagiarismFlag: false,
    techAgeFlag: false,
    flags: [],
    explanation: 'ok',
    routedToReview: false,
    promptRef: 'project-verify@1',
    auditId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('normalizeQlixCompetencyStatus', () => {
  it('maps demonstrated statuses', () => {
    expect(normalizeQlixCompetencyStatus('DEMONSTRATED')).toBe('DEMONSTRATED');
    expect(normalizeQlixCompetencyStatus('PARTIALLY_DEMONSTRATED')).toBe('PARTIALLY_DEMONSTRATED');
  });
});

describe('projectBundleFromQlixEvidence', () => {
  it('fills competency observations from QLIX rows', () => {
    const bundle = projectBundleFromQlixEvidence(
      {
        report: report(),
        competencyObservations: [
          { competencyId: COMP_A, status: 'DEMONSTRATED', evidenceSnippets: ['used index'] },
        ],
        projectId: 'p1',
      },
      { competencyModel: MODEL },
    );
    expect(bundle.available).toBe(true);
    const row = bundle.observations.find((o) => o.competencyId === COMP_A);
    expect(row?.claimedStatus).toBe('DEMONSTRATED');
    expect(row?.evidence.some((e) => e.includes('index'))).toBe(true);
  });
});

describe('mergeProjectObservationBundles', () => {
  it('takes max competency status across projects', () => {
    const b1 = projectBundleFromQlixEvidence(
      {
        report: report(),
        competencyObservations: [{ competencyId: COMP_A, status: 'PARTIALLY_DEMONSTRATED' }],
        projectId: 'p1',
      },
      { competencyModel: MODEL },
    );
    const b2 = projectBundleFromQlixEvidence(
      {
        report: report(),
        competencyObservations: [{ competencyId: COMP_A, status: 'DEMONSTRATED' }],
        projectId: 'p2',
      },
      { competencyModel: MODEL },
    );
    const merged = mergeProjectObservationBundles([b1, b2], { competencyModel: MODEL });
    expect(merged?.observations.find((o) => o.competencyId === COMP_A)?.claimedStatus).toBe(
      'DEMONSTRATED',
    );
  });

  it('returns null when no project bundles', () => {
    const empty = projectToObservationBundle(null, { competencyModel: MODEL });
    expect(mergeProjectObservationBundles([empty], { competencyModel: MODEL })).toBeNull();
  });
});
