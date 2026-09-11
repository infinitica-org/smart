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
      workExperience: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      certificate: {
        findFirst: vi.fn().mockResolvedValue(null),
        count: vi.fn().mockResolvedValue(0),
      },
      candidateCertificate: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      candidateEducation: { findMany: vi.fn().mockResolvedValue([]) },
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

    it('strips a leading @ before resolving the identifier', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: userId, profileVisible: true, usernameStatus: 'ACTIVE' });

      await service.getBySlug('@priya_s');

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
    it('prefers a claimed username over the random slug — stable from the moment it is reserved, not only once ACTIVE', async () => {
      // Reserving alone doesn't make the profile visible (getBySlug still 404s until
      // ACTIVE), but the *link itself* must be stable from the moment it's claimed, so
      // a candidate who copies it before turning visibility on never gets a dead link
      // silently swapped for a different one later.
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        publicProfileSlug: 'abc123',
        username: 'priya_s',
      });

      const result = await service.getOrCreateShareLink(userId);

      expect(result.slug).toBe('priya_s');
      expect(result.url).toContain('/@priya_s');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('falls back to the random slug when no username has been claimed', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        publicProfileSlug: 'abc123',
        username: null,
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

  describe('evaluateActivationEligibility (CN-T07)', () => {
    it('eligible for students with verified skill + verified cert only', async () => {
      prisma.skillClaim.count.mockResolvedValue(1);
      prisma.certificate.count.mockResolvedValue(1);
      prisma.candidateCertificate.count.mockResolvedValue(0);
      prisma.workExperience.count.mockResolvedValue(0);

      const result = await service.evaluateActivationEligibility(userId);

      expect(result.eligible).toBe(true);
      expect(result.verifiedSkillsCount).toBe(1);
      expect(result.verifiedCertsCount).toBe(1);
    });

    it('requires verified work experience when the candidate has any work-experience rows', async () => {
      prisma.skillClaim.count.mockResolvedValue(1);
      prisma.certificate.count.mockResolvedValue(1);
      prisma.candidateCertificate.count.mockResolvedValue(0);
      prisma.workExperience.count
        .mockResolvedValueOnce(0) // verified
        .mockResolvedValueOnce(1); // total

      const result = await service.evaluateActivationEligibility(userId);

      expect(result.eligible).toBe(false);
    });
  });

  describe('recheckActivationAfterVoid (CN-T07)', () => {
    it('turns profile visibility off when eligibility is no longer met', async () => {
      prisma.skillClaim.count.mockResolvedValue(0);
      prisma.certificate.count.mockResolvedValue(0);
      prisma.candidateCertificate.count.mockResolvedValue(0);
      prisma.workExperience.count.mockResolvedValue(0);

      await service.recheckActivationAfterVoid(userId);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { profileVisible: false },
      });
    });

    it('leaves visibility unchanged when eligibility still holds', async () => {
      prisma.skillClaim.count.mockResolvedValue(1);
      prisma.certificate.count.mockResolvedValue(1);
      prisma.candidateCertificate.count.mockResolvedValue(0);
      prisma.workExperience.count.mockResolvedValue(0);

      await service.recheckActivationAfterVoid(userId);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('build — education (CN-T07)', () => {
    it('includes college-confirmed education entries on the public profile', async () => {
      prisma.candidateEducation.findMany.mockResolvedValue([
        {
          institutionName: 'MIT',
          degree: 'B.S.',
          fieldOfStudy: 'Computer Science',
          startDate: '2020-09-01',
          endDate: '2024-06-01',
          current: false,
          grade: '3.9 GPA',
        },
      ]);

      const result = await service.getForOwner(userId);

      expect(result.education).toEqual([
        {
          institutionName: 'MIT',
          degree: 'B.S.',
          fieldOfStudy: 'Computer Science',
          startDate: '2020-09-01',
          endDate: '2024-06-01',
          current: false,
          grade: '3.9 GPA',
        },
      ]);
    });
  });
});
