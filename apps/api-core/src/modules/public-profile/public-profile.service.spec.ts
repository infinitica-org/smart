import { randomUUID } from 'node:crypto';
import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicProfileService } from './public-profile.service.js';

describe('PublicProfileService (CN-T09 visibility + in-progress opt-in)', () => {
  let prisma: any;
  let service: PublicProfileService;

  const userId = randomUUID();

  function baseOwner(overrides: Record<string, unknown> = {}) {
    return {
      fullName: 'Ada Lovelace',
      primaryTrack: null,
      showInProgressItems: false,
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn().mockResolvedValue(baseOwner()),
        update: vi.fn(),
      },
      skillClaim: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      project: { findMany: vi.fn().mockResolvedValue([]) },
      workExperience: { findMany: vi.fn().mockResolvedValue([]) },
      certificate: { findFirst: vi.fn().mockResolvedValue(null) },
      candidateCertificate: { findMany: vi.fn().mockResolvedValue([]) },
    };
    service = new PublicProfileService(prisma);
  });

  describe('getBySlug', () => {
    it('404s exactly like an unknown slug when the owner has visibility off', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: userId, profileVisible: false });
      await expect(service.getBySlug('some-slug')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.user.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it('404s when the slug does not resolve to any user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getBySlug('bogus')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('serves the profile when visibility is on', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: userId, profileVisible: true });
      const result = await service.getBySlug('some-slug');
      expect(result.fullName).toBe('Ada Lovelace');
    });

    it('falls back to an active claimed username when the slug does not match', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null) // slug lookup misses
        .mockResolvedValueOnce({ id: userId, profileVisible: true, usernameStatus: 'ACTIVE' });

      const result = await service.getBySlug('priya_s');

      expect(prisma.user.findUnique).toHaveBeenNthCalledWith(2, {
        where: { usernameNormalized: 'priya_s' },
        select: { id: true, profileVisible: true, usernameStatus: true },
      });
      expect(result.fullName).toBe('Ada Lovelace');
    });

    it('normalizes the identifier (case/whitespace) before the username fallback lookup', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: userId, profileVisible: true, usernameStatus: 'ACTIVE' });

      await service.getBySlug('  Priya_S  ');

      expect(prisma.user.findUnique).toHaveBeenNthCalledWith(2, {
        where: { usernameNormalized: 'priya_s' },
        select: { id: true, profileVisible: true, usernameStatus: true },
      });
    });

    it('404s a merely-reserved (not yet active) username even if visibility happens to be on', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: userId, profileVisible: true, usernameStatus: 'RESERVED' });

      await expect(service.getBySlug('priya_s')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getOrCreateShareLink', () => {
    it('prefers the active claimed username over the random slug', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        publicProfileSlug: 'abc123',
        username: 'priya_s',
        usernameStatus: 'ACTIVE',
      });

      const result = await service.getOrCreateShareLink(userId);

      expect(result.slug).toBe('priya_s');
      expect(result.url).toContain('/candidate/priya_s');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('falls back to the random slug when there is no active username', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        publicProfileSlug: 'abc123',
        username: 'priya_s',
        usernameStatus: 'RESERVED',
      });

      const result = await service.getOrCreateShareLink(userId);

      expect(result.slug).toBe('abc123');
      expect(result.url).toContain('/candidate/abc123');
    });
  });

  describe('build (via getForOwner) — showInProgressItems default off', () => {
    it('queries work experience and certificates as VERIFIED-only by default', async () => {
      await service.getForOwner(userId);

      expect(prisma.workExperience.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { studentId: userId, status: 'VERIFIED' } }),
      );
      expect(prisma.candidateCertificate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { candidateId: userId, status: 'VERIFIED' } }),
      );
    });

    it('marks every returned entry as not in-progress and echoes showInProgressItems=false', async () => {
      prisma.workExperience.findMany.mockResolvedValue([
        {
          companyName: 'Acme',
          role: 'Engineer',
          employmentType: 'FULL_TIME',
          startDate: new Date('2024-01-01'),
          endDate: null,
          isCurrent: true,
          status: 'VERIFIED',
        },
      ]);
      const result = await service.getForOwner(userId);
      expect(result.workExperience[0].inProgress).toBe(false);
      expect(result.showInProgressItems).toBe(false);
    });
  });

  describe('build — showInProgressItems on', () => {
    beforeEach(() => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(baseOwner({ showInProgressItems: true }));
    });

    it('admits not-yet-decided work experience but still excludes REJECTED/EXPIRED/VOIDED', async () => {
      await service.getForOwner(userId);

      expect(prisma.workExperience.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studentId: userId, status: { notIn: ['REJECTED', 'EXPIRED', 'VOIDED'] } },
        }),
      );
      expect(prisma.candidateCertificate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { candidateId: userId, status: { notIn: ['REJECTED', 'VOIDED'] } },
        }),
      );
    });

    it('flags a not-yet-VERIFIED entry as inProgress', async () => {
      prisma.workExperience.findMany.mockResolvedValue([
        {
          companyName: 'Acme',
          role: 'Engineer',
          employmentType: 'FULL_TIME',
          startDate: new Date('2024-01-01'),
          endDate: null,
          isCurrent: true,
          status: 'PENDING_EMPLOYER',
        },
      ]);
      const result = await service.getForOwner(userId);
      expect(result.workExperience[0].inProgress).toBe(true);
      expect(result.showInProgressItems).toBe(true);
    });

    it('a SA-T08-voided entry never leaks through even with the opt-in on', async () => {
      // The service's own where-clause excludes VOIDED; this asserts the query shape does,
      // which is what actually keeps a voided row out at the database level.
      await service.getForOwner(userId);
      const workExperienceCall = prisma.workExperience.findMany.mock.calls[0][0];
      expect(workExperienceCall.where.status.notIn).toContain('VOIDED');
      const certCall = prisma.candidateCertificate.findMany.mock.calls[0][0];
      expect(certCall.where.status.notIn).toContain('VOIDED');
    });
  });
});
