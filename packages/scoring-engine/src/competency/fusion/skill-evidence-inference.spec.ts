import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import type { SkillCompetency } from '@smart/contracts';
import { assessmentToObservationBundle } from './source-adapters/assessment.adapter.js';
import { runSkillEvidenceFusion } from './skill-evidence-inference.js';
import { projectBundleFromQlixEvidence } from './qlix-project-observations.js';

const COMP_A = 'aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee';

const MODEL: SkillCompetency[] = [
  {
    competencyId: COMP_A,
    skillCode: 'SQL_QUERY_OPTIMIZATION',
    capability: 'Writes efficient queries',
    role: 'critical',
    difficulty: 'ADVANCED',
  },
];

describe('runSkillEvidenceFusion', () => {
  it('returns INSUFFICIENT_EVIDENCE when no sources', async () => {
    const result = await runSkillEvidenceFusion({
      skillCode: 'SQL_QUERY_OPTIMIZATION',
      competencyModel: MODEL,
      proficiencyRequirements: [],
      targetProficiency: 'BEGINNER',
      assessmentBundle: null,
      projectBundles: [],
      provenance: {
        ruleSetVersion: 'v1',
        taxonomyVersion: 'skill@1',
        promptRefs: [],
        evidenceRecordIds: [],
      },
    }).pipe(Effect.runPromise);

    expect(result.outcome).toBe('INSUFFICIENT_EVIDENCE');
    expect(result.inferredProficiency).toBeNull();
    expect(result.confidence).toBe('LOW');
  });

  it('infers proficiency when assessment demonstrates competency', async () => {
    const assessment = assessmentToObservationBundle({
      competencyResults: [
        {
          competencyId: COMP_A,
          status: 'DEMONSTRATED',
          confidence: 'HIGH',
          evidence: ['assessment item 1'],
        },
      ],
      testedItemCount: 1,
      proctoringRiskHigh: false,
      competencyModel: MODEL,
    });

    const result = await runSkillEvidenceFusion({
      skillCode: 'SQL_QUERY_OPTIMIZATION',
      competencyModel: MODEL,
      proficiencyRequirements: [
        {
          level: 'BEGINNER',
          requiredCompetencyIds: [COMP_A],
          criticalCompetencyIds: [COMP_A],
          realWorldApplicationRequired: false,
          substantialApplicationRequired: false,
          interviewRequired: false,
        },
      ],
      targetProficiency: 'BEGINNER',
      assessmentBundle: assessment,
      projectBundles: [],
      provenance: {
        ruleSetVersion: 'v1',
        taxonomyVersion: 'skill@1',
        promptRefs: ['capability-inference@1'],
        evidenceRecordIds: [],
      },
    }).pipe(Effect.runPromise);

    expect(result.outcome).toBe('INFERRED');
    expect(result.inferredProficiency).toBe('BEGINNER');
    expect(result.confidence).not.toBeUndefined();
    expect(result.provenance.promptRefs).toContain('capability-inference@1');
  });

  it('merges multiple project evidence bundles', async () => {
    const report = {
      reportId: '11111111-1111-4111-8111-111111111111',
      projectId: '22222222-2222-4222-8222-222222222222',
      score: 80,
      relevanceScore: 75,
      qualityScore: 70,
      duplicateScore: 5,
      confidence: 0.9,
      plagiarismFlag: false,
      techAgeFlag: false,
      flags: [],
      explanation: 'ok',
      routedToReview: false,
      promptRef: 'project-verify@1',
      auditId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const project = projectBundleFromQlixEvidence(
      {
        report,
        competencyObservations: [{ competencyId: COMP_A, status: 'DEMONSTRATED' }],
        projectId: 'p1',
      },
      { competencyModel: MODEL },
    );

    const assessment = assessmentToObservationBundle({
      competencyResults: [
        {
          competencyId: COMP_A,
          status: 'DEMONSTRATED',
          confidence: 'HIGH',
          evidence: ['assessment item 1'],
        },
      ],
      testedItemCount: 1,
      proctoringRiskHigh: false,
      competencyModel: MODEL,
    });

    const result = await runSkillEvidenceFusion({
      skillCode: 'SQL_QUERY_OPTIMIZATION',
      competencyModel: MODEL,
      proficiencyRequirements: [
        {
          level: 'BEGINNER',
          requiredCompetencyIds: [COMP_A],
          criticalCompetencyIds: [COMP_A],
          realWorldApplicationRequired: false,
          substantialApplicationRequired: false,
          interviewRequired: false,
        },
      ],
      targetProficiency: 'BEGINNER',
      assessmentBundle: assessment,
      projectBundles: [project, project],
      provenance: {
        ruleSetVersion: 'v1',
        taxonomyVersion: 'skill@1',
        promptRefs: [report.promptRef],
        evidenceRecordIds: ['33333333-3333-4333-8333-333333333333'],
      },
    }).pipe(Effect.runPromise);

    expect(result.evidenceCount).toBe(2);
    expect(result.outcome).toBe('INFERRED');
  });
});
