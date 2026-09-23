import { describe, expect, it } from 'vitest';
import type { EvidenceRecordDto } from '@smart/contracts';
import {
  buildLinkedSkillEvidenceContext,
  resolveSkillEvidenceContext,
  skillEvidenceContextFromClaimLinkedRecords,
  skillEvidenceContextFromRecords,
} from './skill-evidence-context';

const baseRecord = {
  evidenceId: '11111111-1111-4111-8111-111111111111',
  candidateId: '22222222-2222-4222-8222-222222222222',
  source: 'CANDIDATE' as const,
  relatedSkillIds: ['ETL_ELT_PIPELINE_DEVELOPMENT'],
  verificationStatus: 'VERIFIED' as const,
  artifactIds: [],
  contradictions: [],
  accessibility: 'PRIVATE' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('skillEvidenceContextFromRecords', () => {
  it('maps project and work evidence linked to the skill', () => {
    const projectId = '44444444-4444-4444-8444-444444444444';
    const records: EvidenceRecordDto[] = [
      {
        ...baseRecord,
        evidenceType: 'PROJECT',
        sourceEntityId: projectId,
        claim: 'Batch ELT pipeline with Airflow',
      },
      {
        ...baseRecord,
        evidenceId: '33333333-3333-4333-8333-333333333333',
        evidenceType: 'CREDENTIAL',
        claim: 'Should be ignored',
      },
    ];
    const liveProjectIds = new Set([projectId]);
    const context = skillEvidenceContextFromRecords(records, 'ETL_ELT_PIPELINE_DEVELOPMENT', {
      liveProjectIds,
      projectTitles: new Map([[projectId, 'Batch ELT pipeline with Airflow']]),
    });
    expect(context.availableCount).toBe(1);
    expect(context.items[0]?.label).toBe('Batch ELT pipeline with Airflow');
    expect(context.items[0]?.qualifiesForDemonstration).toBe(true);
    expect(context.items[0]?.href).toContain(`project=${projectId}`);
  });

  it('hides stale work experience evidence when the profile entry was removed', () => {
    const removedId = '55555555-5555-4555-8555-555555555555';
    const records: EvidenceRecordDto[] = [
      {
        ...baseRecord,
        evidenceType: 'WORK_EXPERIENCE',
        sourceEntityId: removedId,
        relatedSkillIds: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
        claim: 'Backend Engineer · Smoke Test Co',
      },
    ];
    const context = skillEvidenceContextFromRecords(
      records,
      'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      { liveExperienceIds: new Set() },
    );
    expect(context.availableCount).toBe(0);
    expect(context.items).toHaveLength(0);
  });

  it('uses live work experience labels for links', () => {
    const experienceId = '66666666-6666-4666-8666-666666666666';
    const records: EvidenceRecordDto[] = [
      {
        ...baseRecord,
        evidenceType: 'WORK_EXPERIENCE',
        sourceEntityId: experienceId,
        relatedSkillIds: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
        claim: 'Outdated label from evidence sync',
      },
    ];
    const context = skillEvidenceContextFromRecords(
      records,
      'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      {
        liveExperienceIds: new Set([experienceId]),
        experienceLabels: new Map([[experienceId, 'Python Backend · Acme Corp']]),
      },
    );
    expect(context.items[0]?.label).toBe('Python Backend · Acme Corp');
    expect(context.items[0]?.href).toContain(`experience=${experienceId}`);
  });

  it('includes projects tagged via skill mappings even without evidence records', () => {
    const projectId = '77777777-7777-4777-8777-777777777777';
    const skillCode = 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT';
    const context = buildLinkedSkillEvidenceContext(
      skillCode,
      [],
      [
        {
          projectId,
          studentId: baseRecord.candidateId,
          title: 'FastAPI Auth Service',
          problem: 'p',
          approach: 'a',
          stack: 'Python',
          outcome: 'o',
          loomUrl: null,
          githubUrl: null,
          liveUrl: null,
          status: 'SUBMITTED',
          createdAt: baseRecord.createdAt,
          report: null,
          interviewRequired: false,
          interviewStatus: 'NOT_REQUIRED',
          interviewCompletedAt: null,
        },
      ],
      new Map([
        [
          projectId,
          [
            {
              skillCode,
              specificContribution: 'Built JWT middleware and refresh rotation.',
              actionsPerformed: [],
              decisionsMade: [],
              constraintsHandled: [],
              verificationStatus: 'PENDING',
            },
          ],
        ],
      ]),
      [],
      { liveProjectIds: new Set([projectId]) },
    );
    expect(context.availableCount).toBe(1);
    expect(context.items[0]?.label).toBe('FastAPI Auth Service');
    expect(context.items[0]?.href).toContain(`project=${projectId}`);
    expect(context.items[0]?.verificationStatus).toBe('PENDING');
  });
});

describe('skillEvidenceContextFromClaimLinkedRecords', () => {
  it('includes credential evidence linked to a claim', () => {
    const records: EvidenceRecordDto[] = [
      {
        ...baseRecord,
        evidenceType: 'CREDENTIAL',
        claim: 'AWS Certified Developer',
        relatedSkillIds: [],
        verificationStatus: 'PROVISIONAL',
      },
    ];
    const context = skillEvidenceContextFromClaimLinkedRecords(
      records,
      'ETL_ELT_PIPELINE_DEVELOPMENT',
    );
    expect(context.availableCount).toBe(1);
    expect(context.claimLinkedSource).toBe(true);
    expect(context.items[0]?.label).toBe('AWS Certified Developer');
    expect(context.items[0]?.verificationStatus).toBe('PROVISIONAL');
  });
});

describe('resolveSkillEvidenceContext', () => {
  it('prefers claim-linked evidence when links exist', () => {
    const claimLinked: EvidenceRecordDto[] = [
      {
        ...baseRecord,
        evidenceType: 'CREDENTIAL',
        claim: 'Linked credential',
        relatedSkillIds: [],
      },
    ];
    const heuristic: EvidenceRecordDto[] = [
      {
        ...baseRecord,
        evidenceType: 'PROJECT',
        sourceEntityId: '44444444-4444-4444-8444-444444444444',
        relatedSkillIds: ['ETL_ELT_PIPELINE_DEVELOPMENT'],
      },
    ];
    const context = resolveSkillEvidenceContext({
      skillCode: 'ETL_ELT_PIPELINE_DEVELOPMENT',
      claimId: '77777777-7777-4777-8777-777777777777',
      claimLinkedRecords: claimLinked,
      heuristicRecords: heuristic,
      projects: [],
      projectMappingsByProjectId: new Map(),
      workExperiences: [],
    });
    expect(context.claimLinkedSource).toBe(true);
    expect(context.items).toHaveLength(1);
    expect(context.items[0]?.label).toBe('Linked credential');
  });

  it('falls back to heuristic evidence when the claim has no links', () => {
    const projectId = '44444444-4444-4444-8444-444444444444';
    const heuristic: EvidenceRecordDto[] = [
      {
        ...baseRecord,
        evidenceType: 'PROJECT',
        sourceEntityId: projectId,
        relatedSkillIds: ['ETL_ELT_PIPELINE_DEVELOPMENT'],
      },
    ];
    const context = resolveSkillEvidenceContext({
      skillCode: 'ETL_ELT_PIPELINE_DEVELOPMENT',
      claimId: '77777777-7777-4777-8777-777777777777',
      claimLinkedRecords: [],
      heuristicRecords: heuristic,
      projects: [],
      projectMappingsByProjectId: new Map(),
      workExperiences: [],
      options: { liveProjectIds: new Set([projectId]) },
    });
    expect(context.claimLinkedSource).toBeUndefined();
    expect(context.availableCount).toBe(1);
  });

  it('marks explicit association empty when claim exists with no linked or heuristic evidence', () => {
    const context = resolveSkillEvidenceContext({
      skillCode: 'ETL_ELT_PIPELINE_DEVELOPMENT',
      claimId: '77777777-7777-4777-8777-777777777777',
      claimLinkedRecords: [],
      heuristicRecords: [],
      projects: [],
      projectMappingsByProjectId: new Map(),
      workExperiences: [],
    });
    expect(context.explicitAssociationEmpty).toBe(true);
    expect(context.availableCount).toBe(0);
  });

  it('uses heuristic evidence when no claimId exists', () => {
    const projectId = '44444444-4444-4444-8444-444444444444';
    const heuristic: EvidenceRecordDto[] = [
      {
        ...baseRecord,
        evidenceType: 'PROJECT',
        sourceEntityId: projectId,
        relatedSkillIds: ['ETL_ELT_PIPELINE_DEVELOPMENT'],
      },
    ];
    const context = resolveSkillEvidenceContext({
      skillCode: 'ETL_ELT_PIPELINE_DEVELOPMENT',
      claimLinkedRecords: [],
      heuristicRecords: heuristic,
      projects: [],
      projectMappingsByProjectId: new Map(),
      workExperiences: [],
      options: { liveProjectIds: new Set([projectId]) },
    });
    expect(context.availableCount).toBe(1);
  });
});
