import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { InstitutionsService } from '../modules/institutions/institutions.service.js';
import { PlacementService } from '../modules/placement/placement.service.js';

/**
 * Cross-tenant access (#166): institution A's staff asking for institution B's records must get
 * 403/404, never B's data. The tables below apply `where` like the database would, so a lookup
 * that forgot to filter on the caller's institution would hand back B's row and fail the test.
 */
const INSTITUTION_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const INSTITUTION_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function table<T extends Record<string, unknown>>(rows: T[]) {
  const matches = (row: T, where: Record<string, unknown>) =>
    Object.entries(where).every(([key, value]) => row[key] === value);
  return {
    findFirst: vi.fn(
      async ({ where }: { where: Record<string, unknown> }) =>
        rows.find((row) => matches(row, where)) ?? null,
    ),
    findUnique: vi.fn(
      async ({ where }: { where: Record<string, unknown> }) =>
        rows.find((row) => matches(row, where)) ?? null,
    ),
    update: vi.fn(),
  };
}

function institutionsService(prisma: unknown) {
  return new InstitutionsService(
    prisma as never,
    {} as never,
    { record: vi.fn() } as never,
    { get: vi.fn(), setex: vi.fn(), del: vi.fn() } as never,
    {} as never,
  );
}

describe('tenant isolation between institutions (#166)', () => {
  it("refuses to put another institution's student on hold", async () => {
    const user = table([
      { id: 'student-b', role: 'STUDENT', institutionId: INSTITUTION_B, heldAt: null },
    ]);
    const service = institutionsService({ user });

    await expect(
      service.holdStudent('student-b', { reason: 'Suspicious activity' }, 'tpo-a', INSTITUTION_A),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(user.update).not.toHaveBeenCalled();
  });

  it("treats another institution's batch as not found", async () => {
    const batch = table([{ id: 'batch-b', institutionId: INSTITUTION_B, name: 'CS 2026' }]);
    const service = institutionsService({ batch });

    await expect(service.getBatch('batch-b', INSTITUTION_A)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(batch.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'batch-b', institutionId: INSTITUTION_A } }),
    );
  });

  it("treats another institution's job opening as not found", async () => {
    const jobOpening = table([{ id: 'opening-b', institutionId: INSTITUTION_B }]);
    const service = new PlacementService(
      { jobOpening } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(service.getOpening(INSTITUTION_A, 'opening-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
