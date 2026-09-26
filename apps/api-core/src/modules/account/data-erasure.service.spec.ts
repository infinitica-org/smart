import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataErasureService } from './data-erasure.service.js';

const requestId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const adminId = '33333333-3333-4333-8333-333333333333';

describe('S6-VV-117 erasure', () => {
  let prisma: any;
  let tx: any;
  let storage: any;
  let auth: any;
  let audit: any;
  let service: DataErasureService;

  const count = (n: number) => vi.fn().mockResolvedValue({ count: n });

  beforeEach(() => {
    tx = {
      candidateEducation: { deleteMany: count(2) },
      candidateLanguage: { deleteMany: count(1) },
      workExperience: { deleteMany: count(1) },
      candidateCertificate: { deleteMany: count(0) },
      savedJob: { deleteMany: count(3) },
      hiddenJob: { deleteMany: count(0) },
      notification: { deleteMany: count(5) },
      emailVerificationToken: { deleteMany: count(1) },
      passwordResetToken: { deleteMany: count(0) },
      refreshToken: { deleteMany: count(2) },
      certificate: { updateMany: count(1) },
      message: { updateMany: count(4) },
      user: { update: vi.fn().mockResolvedValue({}) },
      dataSubjectRequest: { update: vi.fn().mockResolvedValue({}) },
    };
    prisma = {
      dataSubjectRequest: {
        findUnique: vi.fn().mockResolvedValue({
          id: requestId,
          userId,
          type: 'DELETION',
          status: 'IN_REVIEW',
          firstRespondedAt: new Date(),
        }),
      },
      user: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: userId,
          profilePhotoObjectKey: 'photos/u.png',
          evidenceRecords: [{ storageKey: 'evidence/u/cv.pdf' }],
        }),
      },
      $transaction: vi.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
    };
    storage = { deleteObject: vi.fn().mockResolvedValue(undefined) };
    auth = { revokeAllForUser: vi.fn().mockResolvedValue(undefined) };
    audit = { record: vi.fn().mockResolvedValue(undefined) };
    service = new DataErasureService(prisma, storage, auth, audit);
  });

  it('revokes sessions and deletes every uploaded file before touching rows', async () => {
    await service.execute(requestId, adminId, 'Approved: no retention hold.');

    expect(auth.revokeAllForUser).toHaveBeenCalledWith(userId);
    expect(storage.deleteObject.mock.calls.map((call: string[]) => call[0]).sort()).toEqual([
      'evidence/u/cv.pdf',
      'photos/u.png',
    ]);
    expect(storage.deleteObject.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.$transaction.mock.invocationCallOrder[0],
    );
  });

  it('leaves no personal details on the user row', async () => {
    await service.execute(requestId, adminId, 'Approved: no retention hold.');

    const { data } = tx.user.update.mock.calls[0][0];
    expect(data).toMatchObject({
      email: `deleted+${userId}@deleted.invalid`,
      fullName: 'Deleted user',
      passwordHash: null,
      profilePhotoObjectKey: null,
      username: null,
      publicProfileSlug: null,
      graduationYear: null,
      profileVisible: false,
      allowEmployerMessages: false,
    });
    expect(data.deactivatedAt).toBeInstanceOf(Date);
    expect(JSON.stringify(data)).not.toMatch(/Ada|@uni\.edu/);
  });

  it('revokes issued certificates and redacts sent messages instead of deleting them', async () => {
    await service.execute(requestId, adminId, 'Approved: no retention hold.');

    expect(tx.certificate.updateMany).toHaveBeenCalledWith({
      where: { userId, status: 'ISSUED' },
      data: { status: 'REVOKED' },
    });
    expect(tx.message.updateMany.mock.calls[0][0].data.body).toBe('[deleted]');
  });

  it('closes the request with a manifest of what was deleted, kept and why', async () => {
    await service.execute(requestId, adminId, 'Approved: no retention hold.');

    const { data } = tx.dataSubjectRequest.update.mock.calls[0][0];
    expect(data).toMatchObject({ status: 'COMPLETED', resolvedById: adminId });
    expect(data.resolution).toContain('Approved: no retention hold.');
    expect(data.resolution).toContain('2 candidateEducations');
    expect(data.resolution).toContain('2 uploaded files');
    expect(data.resolution).toMatch(/Kept: .*applications/);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'data_request.erasure_completed',
        metadata: expect.objectContaining({ userId, filesDeleted: 2, revokedCertificates: 1 }),
      }),
    );
  });

  it('is a no-op for a request that is already completed or not a deletion', async () => {
    prisma.dataSubjectRequest.findUnique.mockResolvedValueOnce({
      type: 'DELETION',
      status: 'COMPLETED',
    });
    await service.execute(requestId, adminId, 'again');
    prisma.dataSubjectRequest.findUnique.mockResolvedValueOnce({
      type: 'CORRECTION',
      status: 'OPEN',
    });
    await service.execute(requestId, adminId, 'wrong type');

    expect(auth.revokeAllForUser).not.toHaveBeenCalled();
    expect(storage.deleteObject).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
