import { describe, expect, it, vi } from 'vitest';
import { EvidenceSnapshotGuard } from './evidence-snapshot.guard.js';

describe('EvidenceSnapshotGuard (Th6-394)', () => {
  const setup = (hit: unknown) => {
    const prisma: any = { applicationSnapshot: { findFirst: vi.fn(async () => hit) } };
    return { prisma, guard: new EvidenceSnapshotGuard(prisma) };
  };

  it('blocks deleting evidence that a submitted application snapshot references (409)', async () => {
    const { guard, prisma } = setup({ id: 'snap-1' });
    await expect(
      guard.assertNotReferenced('student-1', { type: 'work_experience', id: 'we-1' }),
    ).rejects.toMatchObject({ status: 409 });
    const where = prisma.applicationSnapshot.findFirst.mock.calls[0]?.[0].where;
    expect(where.application).toEqual({ studentId: 'student-1' });
    expect(where.evidenceRefs).toEqual({
      array_contains: [{ type: 'work_experience', id: 'we-1' }],
    });
  });

  it('allows deleting evidence no snapshot uses', async () => {
    const { guard } = setup(null);
    await expect(
      guard.assertNotReferenced('student-1', { type: 'work_experience_document', id: 'doc-1' }),
    ).resolves.toBeUndefined();
  });
});
