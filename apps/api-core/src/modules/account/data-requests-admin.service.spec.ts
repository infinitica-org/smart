import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataRequestsAdminService, toAdminDto } from './data-requests-admin.service.js';

const requestId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const adminId = '33333333-3333-4333-8333-333333333333';
const DAY = 86_400_000;

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: requestId,
    userId,
    type: 'CORRECTION',
    status: 'OPEN',
    details: 'My graduation year is wrong.',
    createdAt: new Date(),
    resolvedAt: null,
    exportKey: null,
    firstRespondedAt: null,
    resolution: null,
    resolvedById: null,
    user: { email: 'ada@uni.edu', fullName: 'Ada' },
    ...overrides,
  } as any;
}

describe('S6-VV-116 data-request queue', () => {
  let prisma: any;
  let audit: any;
  let notifications: any;
  let service: DataRequestsAdminService;

  beforeEach(() => {
    prisma = {
      dataSubjectRequest: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(row()),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    audit = { record: vi.fn().mockResolvedValue(undefined) };
    notifications = { notify: vi.fn().mockResolvedValue({}) };
    service = new DataRequestsAdminService(prisma, audit, notifications);
  });

  it('lists the open queue, oldest first, by default', async () => {
    await service.list();

    expect(prisma.dataSubjectRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { in: ['OPEN', 'IN_REVIEW'] } },
        orderBy: { createdAt: 'asc' },
      }),
    );
  });

  it('flags a missed first response at 7 days and a missed close at 30', () => {
    const now = Date.now();
    expect(toAdminDto(row({ createdAt: new Date(now - 2 * DAY) }), now).slaState).toBe('on_track');
    expect(toAdminDto(row({ createdAt: new Date(now - 8 * DAY) }), now).slaState).toBe(
      'response_overdue',
    );
    expect(
      toAdminDto(row({ createdAt: new Date(now - 8 * DAY), firstRespondedAt: new Date() }), now)
        .slaState,
    ).toBe('on_track');
    expect(
      toAdminDto(row({ status: 'IN_REVIEW', createdAt: new Date(now - 31 * DAY) }), now).slaState,
    ).toBe('close_overdue');
    expect(
      toAdminDto(row({ status: 'COMPLETED', createdAt: new Date(now - 31 * DAY) }), now).slaState,
    ).toBe('on_track');
  });

  it('starts review: records the first response, audits and tells the student', async () => {
    await service.startReview(requestId, adminId);

    expect(prisma.dataSubjectRequest.updateMany).toHaveBeenCalledWith({
      where: { id: requestId, status: 'OPEN' },
      data: expect.objectContaining({ status: 'IN_REVIEW', firstRespondedAt: expect.any(Date) }),
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: adminId,
        action: 'data_request.in_review',
        metadata: expect.objectContaining({ prior: 'OPEN', next: 'IN_REVIEW' }),
      }),
    );
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId, kind: 'ACCOUNT', dedupeKey: `dsr:${requestId}:IN_REVIEW` }),
    );
  });

  it('completes a correction with the note the student will see', async () => {
    prisma.dataSubjectRequest.findUnique.mockResolvedValue(row({ status: 'IN_REVIEW' }));

    await service.resolve(requestId, adminId, 'COMPLETED', 'Fixed your graduation year.');

    expect(prisma.dataSubjectRequest.updateMany.mock.calls[0][0].data).toMatchObject({
      status: 'COMPLETED',
      resolution: 'Fixed your graduation year.',
      resolvedById: adminId,
    });
    expect(notifications.notify.mock.calls[0][0].body).toBe('Fixed your graduation year.');
  });

  it('never changes a closed request', async () => {
    prisma.dataSubjectRequest.findUnique.mockResolvedValue(row({ status: 'REJECTED' }));

    await expect(
      service.resolve(requestId, adminId, 'COMPLETED', 'Changed my mind'),
    ).rejects.toMatchObject({
      response: { error: 'already_resolved' },
    });
    expect(prisma.dataSubjectRequest.updateMany).not.toHaveBeenCalled();
  });

  it('leaves deletions to the erasure job and exports to the automatic flow', async () => {
    prisma.dataSubjectRequest.findUnique.mockResolvedValue(row({ type: 'DELETION' }));
    await expect(
      service.resolve(requestId, adminId, 'COMPLETED', 'Deleted by hand'),
    ).rejects.toMatchObject({
      response: { error: 'use_erasure' },
    });

    prisma.dataSubjectRequest.findUnique.mockResolvedValue(row({ type: 'EXPORT' }));
    await expect(service.startReview(requestId, adminId)).rejects.toMatchObject({
      response: { error: 'automatic' },
    });
  });

  it('can reject a deletion with a reason', async () => {
    prisma.dataSubjectRequest.findUnique.mockResolvedValue(row({ type: 'DELETION' }));

    await service.resolve(
      requestId,
      adminId,
      'REJECTED',
      'Placement records must be kept 2 years.',
    );

    expect(prisma.dataSubjectRequest.updateMany.mock.calls[0][0].data.status).toBe('REJECTED');
  });

  it('refuses when another admin changed the request first', async () => {
    prisma.dataSubjectRequest.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.startReview(requestId, adminId)).rejects.toMatchObject({
      response: { error: 'changed' },
    });
    expect(audit.record).not.toHaveBeenCalled();
  });
});
