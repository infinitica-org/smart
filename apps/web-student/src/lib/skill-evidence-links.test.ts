import { describe, expect, it } from 'vitest';
import type { EvidenceRecordDto } from '@smart/contracts';
import {
  profileProjectHref,
  skillEvidenceProfileHref,
  skillEvidenceTitle,
} from './skill-evidence-links';

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

describe('skillEvidenceTitle', () => {
  it('uses project title from payload and links to the project on profile', () => {
    const projectId = '7cf5e6c9-621d-4dae-a94b-0053f952d890';
    const record: EvidenceRecordDto = {
      ...baseRecord,
      evidenceType: 'PROJECT',
      sourceEntityId: projectId,
      sourcePayload: { projectId, title: 'Lakehouse ELT Pipeline' },
    };
    expect(skillEvidenceTitle(record)).toBe('Lakehouse ELT Pipeline');
    expect(skillEvidenceProfileHref(record)).toBe(profileProjectHref(projectId));
  });

  it('falls back to listMine project titles when claim text is generic', () => {
    const projectId = '7cf5e6c9-621d-4dae-a94b-0053f952d890';
    const record: EvidenceRecordDto = {
      ...baseRecord,
      evidenceType: 'PROJECT',
      sourceEntityId: projectId,
      claim: 'Personal contribution in a project',
    };
    const titles = new Map([[projectId, 'Customer 360 Batch Loader']]);
    expect(skillEvidenceTitle(record, { projectTitles: titles })).toBe('Customer 360 Batch Loader');
  });

  it('returns no profile href when the work experience id is not on the profile anymore', () => {
    const experienceId = '66666666-6666-4666-8666-666666666666';
    const record: EvidenceRecordDto = {
      ...baseRecord,
      evidenceType: 'WORK_EXPERIENCE',
      sourceEntityId: experienceId,
    };
    expect(
      skillEvidenceProfileHref(record, { experienceIds: new Set(['other-id']) }),
    ).toBeUndefined();
  });
});
