import { describe, expect, it } from 'vitest';
import {
  EvidenceRecordVersionDtoSchema,
  EvidenceRecordVersionRedactedDtoSchema,
} from './evidence-version.dto.js';

describe('EvidenceRecordVersionDtoSchema', () => {
  it('accepts a valid version dto', () => {
    const parsed = EvidenceRecordVersionDtoSchema.parse({
      versionId: '123e4567-e89b-12d3-a456-426614174000',
      evidenceId: '223e4567-e89b-12d3-a456-426614174001',
      versionNumber: 1,
      snapshot: {
        evidenceId: '223e4567-e89b-12d3-a456-426614174001',
        candidateId: '323e4567-e89b-12d3-a456-426614174002',
        evidenceType: 'PROJECT',
        source: 'CANDIDATE',
        relatedSkillIds: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
        verificationStatus: 'PENDING',
        artifactIds: [],
        contradictions: [],
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
      actorId: '323e4567-e89b-12d3-a456-426614174002',
      organizationId: '423e4567-e89b-12d3-a456-426614174003',
      source: 'CANDIDATE',
      priorVerificationStatus: null,
      newVerificationStatus: 'PENDING',
      createdAt: '2026-09-01T00:00:00.000Z',
    });
    expect(parsed.versionNumber).toBe(1);
  });

  it('redacted dto omits sensitive snapshot fields', () => {
    const parsed = EvidenceRecordVersionRedactedDtoSchema.parse({
      versionId: '123e4567-e89b-12d3-a456-426614174000',
      evidenceId: '223e4567-e89b-12d3-a456-426614174001',
      versionNumber: 2,
      snapshot: {
        evidenceId: '223e4567-e89b-12d3-a456-426614174001',
        candidateId: '323e4567-e89b-12d3-a456-426614174002',
        evidenceType: 'WORK_EXPERIENCE',
        source: 'CANDIDATE',
        relatedSkillIds: [],
        verificationStatus: 'VERIFIED',
        artifactIds: [],
        contradictions: [],
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-02T00:00:00.000Z',
      },
      source: 'SYSTEM',
      newVerificationStatus: 'VERIFIED',
      createdAt: '2026-09-02T00:00:00.000Z',
    });
    expect(parsed.snapshot).not.toHaveProperty('sourcePayload');
  });
});
