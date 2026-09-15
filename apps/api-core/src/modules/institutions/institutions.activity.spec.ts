import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InstitutionsService } from './institutions.service.js';

const noopRedis = { get: vi.fn(), setex: vi.fn(), del: vi.fn() };

const institutionId = randomUUID();

interface FakeAttempt {
  userId: string;
  startedAt: Date;
  institutionId: string;
  role: string;
}

/**
 * Builds a Prisma stub whose `attempt.groupBy` actually filters the given
 * fixture attempts by the `where` clause the service passes in, instead of
 * blindly returning a canned value. That way these tests exercise the real
 * 30-day cutoff and STUDENT-role filter logic in
 * `InstitutionsService.countActiveStudents30d`, not just the plumbing.
 */
function buildPrisma(attempts: FakeAttempt[]) {
  return {
    institution: {
      findUnique: vi.fn().mockResolvedValue({
        id: institutionId,
        name: 'Test Institution',
        domain: 'test.edu',
        verificationStatus: 'APPROVED',
        heldAt: null,
        deactivatedAt: null,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        plan: { code: 'PRO' },
      }),
    },
    user: { groupBy: vi.fn().mockResolvedValue([]) },
    invitation: { groupBy: vi.fn().mockResolvedValue([]) },
    batch: { groupBy: vi.fn().mockResolvedValue([]) },
    attempt: {
      groupBy: vi
        .fn()
        .mockImplementation(
          ({
            where,
          }: {
            where: { startedAt: { gte: Date }; user: { institutionId: string; role: string } };
          }) => {
            const cutoff = where.startedAt.gte.getTime();
            const matches = attempts.filter(
              (attempt) =>
                attempt.startedAt.getTime() >= cutoff &&
                attempt.institutionId === where.user.institutionId &&
                attempt.role === where.user.role,
            );
            const distinctUserIds = [...new Set(matches.map((attempt) => attempt.userId))];
            return Promise.resolve(
              distinctUserIds.map((userId) => ({
                userId,
                _count: { _all: matches.filter((attempt) => attempt.userId === userId).length },
              })),
            );
          },
        ),
    },
  };
}

describe('InstitutionsService.getInstitution activeStudents30d', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts a STUDENT attempt exactly at the 30-day cutoff and excludes one just outside it', async () => {
    const now = new Date('2026-01-30T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const withinCutoffStudentId = randomUUID();
    const justOutsideCutoffStudentId = randomUUID();
    const attempts: FakeAttempt[] = [
      // Exactly at the cutoff instant: the service's `gte` comparison must include it.
      { userId: withinCutoffStudentId, startedAt: cutoff, institutionId, role: 'STUDENT' },
      // One millisecond before the cutoff: must NOT be counted.
      {
        userId: justOutsideCutoffStudentId,
        startedAt: new Date(cutoff.getTime() - 1),
        institutionId,
        role: 'STUDENT',
      },
    ];
    const prisma = buildPrisma(attempts);
    const service = new InstitutionsService(
      prisma as never,
      {} as never,
      {} as never,
      noopRedis as never,
    );

    const dto = await service.getInstitution(institutionId);

    expect(dto.activeStudents30d).toBe(1);
  });

  it('excludes a non-STUDENT user activity from the active count even when recent', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    const attempts: FakeAttempt[] = [
      // Started moments ago, but the user is not a STUDENT, so it must not count.
      { userId: randomUUID(), startedAt: new Date(), institutionId, role: 'INSTITUTION_ADMIN' },
    ];
    const prisma = buildPrisma(attempts);
    const service = new InstitutionsService(
      prisma as never,
      {} as never,
      {} as never,
      noopRedis as never,
    );

    const dto = await service.getInstitution(institutionId);

    expect(dto.activeStudents30d).toBe(0);
  });

  it('deduplicates multiple attempts from the same student into a single count', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-30T12:00:00Z'));

    const studentId = randomUUID();
    const attempts: FakeAttempt[] = [
      { userId: studentId, startedAt: new Date(), institutionId, role: 'STUDENT' },
      { userId: studentId, startedAt: new Date(), institutionId, role: 'STUDENT' },
    ];
    const prisma = buildPrisma(attempts);
    const service = new InstitutionsService(
      prisma as never,
      {} as never,
      {} as never,
      noopRedis as never,
    );

    const dto = await service.getInstitution(institutionId);

    expect(dto.activeStudents30d).toBe(1);
  });
});
