import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { collectStorageKeys, DataExportService } from './data-export.service.js';

const userId = '11111111-1111-4111-8111-111111111111';
const otherUserId = '22222222-2222-4222-8222-222222222222';
const requestId = '33333333-3333-4333-8333-333333333333';

function exportRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: requestId,
    userId,
    type: 'EXPORT',
    status: 'OPEN',
    details: '',
    createdAt: new Date(),
    resolvedAt: null,
    exportKey: null,
    ...overrides,
  };
}

describe('S6-VV-115 data export', () => {
  let prisma: any;
  let storage: any;
  let audit: any;
  let notifications: any;
  let service: DataExportService;
  let stored: Buffer | undefined;

  beforeEach(() => {
    stored = undefined;
    prisma = {
      dataSubjectRequest: {
        findUnique: vi.fn().mockResolvedValue(exportRequest()),
        findFirst: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
      },
      user: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: userId,
          email: 'ada@uni.edu',
          evidenceRecords: [{ id: 'e1', storageKey: 'evidence/ada/cv.pdf' }],
          workExperiences: [
            { id: 'w1', supportingDocKeys: ['we/ada/offer.pdf', 'we/ada/relieving.pdf'] },
          ],
          candidateCertificates: [{ id: 'c1', certificateFileUrl: 'https://issuer.example/c1' }],
          profilePhotoObjectKey: 'photos/ada.png',
        }),
      },
    };
    storage = {
      putObjectBuffer: vi.fn(async ({ buffer }: { buffer: Buffer }) => {
        stored = buffer;
      }),
      getObjectBuffer: vi.fn(async () => stored ?? Buffer.from('{}')),
      getSignedDownloadUrl: vi.fn(async (key: string) => `https://signed/${key}`),
    };
    audit = { record: vi.fn().mockResolvedValue(undefined) };
    notifications = { notify: vi.fn().mockResolvedValue({}) };
    service = new DataExportService(prisma, storage, audit, notifications);
  });

  it("bundles only the requester's own rows, without the password hash", async () => {
    await service.build(requestId);

    const query = prisma.user.findUniqueOrThrow.mock.calls[0][0];
    expect(query.where).toEqual({ id: userId });
    expect(query.omit).toEqual({ passwordHash: true });
    expect(query.include).not.toHaveProperty('profileViewsReceived');
    expect(storage.putObjectBuffer).toHaveBeenCalledWith(
      expect.objectContaining({ objectKey: `dsr-exports/${userId}/${requestId}.json` }),
    );
    const bundle = JSON.parse(stored!.toString());
    expect(bundle.data.id).toBe(userId);
    expect(JSON.stringify(bundle)).not.toContain(otherUserId);
  });

  it('lists uploaded files by storage key, skipping external URLs', async () => {
    await service.build(requestId);

    const bundle = JSON.parse(stored!.toString());
    expect(bundle.files.sort()).toEqual(
      ['evidence/ada/cv.pdf', 'photos/ada.png', 'we/ada/offer.pdf', 'we/ada/relieving.pdf'].sort(),
    );
  });

  it('completes the request, audits it and tells the student in-app', async () => {
    await service.build(requestId);

    expect(prisma.dataSubjectRequest.update).toHaveBeenCalledWith({
      where: { id: requestId },
      data: expect.objectContaining({
        status: 'COMPLETED',
        exportKey: `dsr-exports/${userId}/${requestId}.json`,
      }),
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'data_request.export_completed', resourceId: requestId }),
    );
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId, kind: 'ACCOUNT', dedupeKey: `dsr-export:${requestId}` }),
    );
    expect(notifications.notify.mock.calls[0][0].emailTemplate).toBeUndefined();
  });

  it('is idempotent: a redelivered job for a finished export does nothing', async () => {
    prisma.dataSubjectRequest.findUnique.mockResolvedValue(exportRequest({ status: 'COMPLETED' }));

    await service.build(requestId);

    expect(storage.putObjectBuffer).not.toHaveBeenCalled();
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('hands out signed links for the bundle and every file, and audits the download', async () => {
    await service.build(requestId);
    prisma.dataSubjectRequest.findFirst.mockResolvedValue(
      exportRequest({
        status: 'COMPLETED',
        resolvedAt: new Date(),
        exportKey: `dsr-exports/${userId}/${requestId}.json`,
      }),
    );

    const result = await service.download(userId, requestId);

    expect(prisma.dataSubjectRequest.findFirst.mock.calls[0][0].where).toMatchObject({
      id: requestId,
      userId,
      type: 'EXPORT',
    });
    expect(result.bundleUrl).toBe(`https://signed/dsr-exports/${userId}/${requestId}.json`);
    expect(result.files).toHaveLength(4);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: userId, action: 'data_request.export_downloaded' }),
    );
  });

  it("404s another user's export and one older than 7 days", async () => {
    prisma.dataSubjectRequest.findFirst.mockResolvedValue(null);
    await expect(service.download(otherUserId, requestId)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    prisma.dataSubjectRequest.findFirst.mockResolvedValue(
      exportRequest({
        status: 'COMPLETED',
        resolvedAt: new Date(Date.now() - 8 * 86_400_000),
        exportKey: 'dsr-exports/x.json',
      }),
    );
    await expect(service.download(userId, requestId)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('collectStorageKeys', () => {
  it('walks nested rows and de-duplicates', () => {
    expect(
      collectStorageKeys({
        a: [{ storageKey: 'k1' }, { documentObjectKey: 'k1' }],
        b: { logoStorageKey: 'k2' },
      }),
    ).toEqual(['k1', 'k2']);
  });
});
