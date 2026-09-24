import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicProfileService } from './public-profile.service.js';

const userId = '123e4567-e89b-12d3-a456-426614174000';

describe('PublicProfileService project portfolio filter', () => {
  const prisma = {
    user: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    skillClaim: { findMany: vi.fn(), count: vi.fn() },
    project: { findMany: vi.fn() },
    workExperience: { findMany: vi.fn() },
    certificate: { findFirst: vi.fn() },
    candidateCertificate: { findMany: vi.fn() },
    candidateEducation: { findMany: vi.fn() },
    studentCapability: { findMany: vi.fn() },
  };
  const storage = { getSignedUrl: vi.fn() };

  let service: PublicProfileService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      fullName: 'Ada',
      profilePhotoObjectKey: null,
      primaryTrack: null,
      showInProgressItems: false,
      allowEmployerMessages: true,
    });
    prisma.skillClaim.findMany.mockResolvedValue([]);
    prisma.skillClaim.count.mockResolvedValue(0);
    prisma.project.findMany.mockResolvedValue([]);
    prisma.workExperience.findMany.mockResolvedValue([]);
    prisma.certificate.findFirst.mockResolvedValue(null);
    prisma.candidateCertificate.findMany.mockResolvedValue([]);
    prisma.candidateEducation.findMany.mockResolvedValue([]);
    prisma.studentCapability.findMany.mockResolvedValue([]);
    service = new PublicProfileService(prisma as never, storage as never);
  });

  it('excludes inactive replaced projects from the public profile query', async () => {
    await service.getForOwner(userId);
    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId: userId, isActive: true, status: { not: 'REJECTED' } },
      }),
    );
  });

  it('tells employers whether the student accepts messages (STU-02)', async () => {
    const on = await service.getForOwner(userId);
    expect(on.acceptsEmployerMessages).toBe(true);

    prisma.user.findUniqueOrThrow.mockResolvedValue({
      fullName: 'Ada',
      profilePhotoObjectKey: null,
      primaryTrack: null,
      showInProgressItems: false,
      allowEmployerMessages: false,
    });
    const off = await service.getForOwner(userId);
    expect(off.acceptsEmployerMessages).toBe(false);
  });
});
