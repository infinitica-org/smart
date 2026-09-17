import { describe, expect, it } from 'vitest';
import type { EvidenceRecordDto } from '@smart/contracts';
import {
  buildLinkedSkillEvidenceContext,
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
