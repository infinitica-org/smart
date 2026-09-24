import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EvidenceVersionService } from './evidence-version.service.js';
import { assertCanReadCandidateEvidenceVersions } from './evidence-version-auth.helper.js';

function buildService(overrides?: {
  prisma?: Record<string, unknown>;
  auditPublisher?: { record: ReturnType<typeof vi.fn> };
}) {
  const prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue({ institutionId: 'inst-1' }),
    },
    evidenceRecord: {
      findFirst: vi.fn().mockResolvedValue({ id: 'evidence-1' }),
    },
    evidenceRecordVersion: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({
        id: 'version-1',
        evidenceId: 'evidence-1',
        versionNumber: 1,
        snapshot: {},
        mutationKey: 'create:evidence-1',
        actorId: 'student-1',
        organizationId: 'inst-1',
        source: 'CANDIDATE',
        priorVerificationStatus: null,
        newVerificationStatus: 'PENDING',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    },
    ...overrides?.prisma,
  };

  const auditPublisher = overrides?.auditPublisher ?? {
    record: vi.fn().mockResolvedValue(undefined),
  };
  const service = new EvidenceVersionService(prisma as never, auditPublisher as never);
  return { service, prisma, auditPublisher };
}

describe('EvidenceVersionService', () => {
  it('creates version 1 in transaction', async () => {
    const { service, prisma, auditPublisher } = buildService();
    const row = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      studentId: '323e4567-e89b-12d3-a456-426614174002',
      evidenceType: 'PROJECT' as const,
      source: 'CANDIDATE' as const,
      verificationStatus: 'PENDING' as const,
      relatedSkillCodes: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      artifacts: [],
    };

    const result = await service.createInitialVersion(
      {
        evidenceRecordVersion: { create: prisma.evidenceRecordVersion.create },
      } as never,
      row as never,
      {
        mutationKey: 'create:evidence-1',
        actorId: 'student-1',
        organizationId: 'inst-1',
        source: 'CANDIDATE',
        priorVerificationStatus: null,
        newVerificationStatus: 'PENDING',
      },
    );

    expect(result).toBe('created');
    expect(prisma.evidenceRecordVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ versionNumber: 1 }),
      }),
    );
    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'evidence.version_created' }),
    );
  });

  it('returns duplicate on unique mutation key violation', async () => {
    const { service } = buildService({
      prisma: {
        evidenceRecordVersion: {
          create: vi.fn().mockRejectedValue({ code: 'P2002' }),
        },
      },
    });

    const result = await service.createInitialVersion(
      {
        evidenceRecordVersion: { create: vi.fn().mockRejectedValue({ code: 'P2002' }) },
      } as never,
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        studentId: '323e4567-e89b-12d3-a456-426614174002',
        evidenceType: 'PROJECT' as const,
        source: 'CANDIDATE' as const,
        verificationStatus: 'PENDING' as const,
        relatedSkillCodes: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        artifacts: [],
      } as never,
      {
        mutationKey: 'create:evidence-1',
        actorId: 'student-1',
        organizationId: 'inst-1',
        source: 'CANDIDATE',
        priorVerificationStatus: null,
        newVerificationStatus: 'PENDING',
      },
    );

    expect(result).toBe('duplicate');
  });
});

describe('assertCanReadCandidateEvidenceVersions', () => {
  it('denies institution staff outside candidate institution', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'student-1',
          role: 'STUDENT',
          institutionId: 'inst-1',
        }),
      },
    };

    await expect(
      assertCanReadCandidateEvidenceVersions(
        prisma as never,
        {
          sub: 'staff-1',
          role: 'PLACEMENT_STAFF',
          inst: 'inst-2',
        } as never,
        'student-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies an unverified company before checking application ownership', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'student-1',
          role: 'STUDENT',
          institutionId: 'inst-1',
        }),
      },
      company: {
        findUnique: vi.fn().mockResolvedValue({ verificationStatus: 'PENDING' }),
      },
      application: {
        count: vi.fn().mockResolvedValue(1),
      },
    };

    await expect(
      assertCanReadCandidateEvidenceVersions(
        prisma as never,
        {
          sub: 'company-user',
          role: 'COMPANY',
          companyId: 'company-1',
        } as never,
        'student-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.application.count).not.toHaveBeenCalled();
  });

  it('requires company application relationship for redacted access', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'student-1',
          role: 'STUDENT',
          institutionId: 'inst-1',
        }),
      },
      company: {
        findUnique: vi.fn().mockResolvedValue({ verificationStatus: 'APPROVED' }),
      },
      application: {
        count: vi.fn().mockResolvedValue(0),
      },
    };

    await expect(
      assertCanReadCandidateEvidenceVersions(
        prisma as never,
        {
          sub: 'company-user',
          role: 'COMPANY',
          companyId: 'company-1',
        } as never,
        'student-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows company read with application and redacts', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'student-1',
          role: 'STUDENT',
          institutionId: 'inst-1',
        }),
      },
      company: {
        findUnique: vi.fn().mockResolvedValue({ verificationStatus: 'APPROVED' }),
      },
      application: {
        count: vi.fn().mockResolvedValue(1),
      },
    };

    const access = await assertCanReadCandidateEvidenceVersions(
      prisma as never,
      {
        sub: 'company-user',
        role: 'COMPANY',
        companyId: 'company-1',
      } as never,
      'student-1',
    );

    expect(access.redacted).toBe(true);
  });

  it('throws not found for missing candidate', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    await expect(
      assertCanReadCandidateEvidenceVersions(
        prisma as never,
        {
          sub: 'staff-1',
          role: 'SUPER_ADMIN',
        } as never,
        'missing',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
