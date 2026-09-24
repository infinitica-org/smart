import { describe, expect, it, vi } from 'vitest';
import { EvidenceSyncService } from './evidence-sync.service.js';

describe('EvidenceSyncService versioning', () => {
  it('does not update or version when normalized content is unchanged', async () => {
    const existing = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      studentId: '323e4567-e89b-12d3-a456-426614174002',
      evidenceType: 'WORK_EXPERIENCE',
      source: 'CANDIDATE',
      sourceEntityId: '223e4567-e89b-12d3-a456-426614174001',
      verificationStatus: 'PENDING',
      relatedSkillCodes: [],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      artifacts: [],
    };

    const prisma = {
      workExperience: {
        findFirst: vi.fn().mockResolvedValue({
          id: '223e4567-e89b-12d3-a456-426614174001',
          studentId: '323e4567-e89b-12d3-a456-426614174002',
          companyName: 'Acme',
          role: 'Engineer',
          employmentType: 'FULL_TIME',
          startDate: new Date('2024-01-01T00:00:00.000Z'),
          endDate: null,
          workLocation: 'Remote',
          department: 'Eng',
          responsibilities: 'Built APIs',
          skills: [],
          status: 'DRAFT',
          verifierName: null,
          verifierEmail: null,
          verifierDesignation: null,
          verifierPhone: null,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          structuredResponsibilities: [],
        }),
      },
      evidenceRecord: {
        findFirst: vi.fn().mockResolvedValue(existing),
        update: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    const reconciliation = { reconcileForStudent: vi.fn() };
    const evidenceVersions = {
      resolveStudentOrganizationId: vi.fn().mockResolvedValue('inst-1'),
      contentEquals: vi.fn().mockReturnValue(true),
      hashContent: vi.fn(),
      createInitialVersion: vi.fn(),
      appendVersion: vi.fn(),
    };

    const skillInference = {
      recomputeForStudentSkills: vi.fn().mockResolvedValue(undefined),
    };

    const service = new EvidenceSyncService(
      prisma as never,
      reconciliation as never,
      evidenceVersions as never,
      skillInference as never,
    );

    await service.syncWorkExperienceEvidenceRecord(
      '323e4567-e89b-12d3-a456-426614174002',
      '223e4567-e89b-12d3-a456-426614174001',
    );

    expect(prisma.evidenceRecord.update).not.toHaveBeenCalled();
    expect(evidenceVersions.appendVersion).not.toHaveBeenCalled();
    expect(reconciliation.reconcileForStudent).not.toHaveBeenCalled();
  });
});
