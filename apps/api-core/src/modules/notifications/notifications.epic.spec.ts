import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { NotificationsService } from './notifications.service.js';

const userId = randomUUID();
const notificationId = randomUUID();

function setupNotificationsEpicTest() {
  const emailQueue = {
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
  };

  const prisma: any = {
    notification: {
      create: vi.fn().mockResolvedValue({
        id: notificationId,
        userId,
        kind: 'OPPORTUNITY',
        title: 'New Campus Placement Drive',
        body: 'Acme Corp is hiring Fullstack Engineers.',
        linkUrl: null,
        metadata: null,
        readAt: null,
        createdAt: new Date(),
      }),
      findMany: vi.fn().mockResolvedValue([
        {
          id: notificationId,
          userId,
          kind: 'OPPORTUNITY',
          title: 'New Campus Placement Drive',
          body: 'Acme Corp is hiring Fullstack Engineers.',
          linkUrl: null,
          metadata: null,
          readAt: null,
          createdAt: new Date(),
        },
      ]),
      findFirst: vi.fn().mockResolvedValue({
        id: notificationId,
        userId,
        kind: 'OPPORTUNITY',
        title: 'New Campus Placement Drive',
        body: 'Acme Corp is hiring Fullstack Engineers.',
        linkUrl: null,
        metadata: null,
        readAt: null,
        createdAt: new Date(),
      }),
      count: vi.fn().mockResolvedValue(1),
      update: vi.fn().mockResolvedValue({
        id: notificationId,
        userId,
        kind: 'OPPORTUNITY',
        title: 'New Campus Placement Drive',
        body: 'Acme Corp is hiring Fullstack Engineers.',
        linkUrl: null,
        metadata: null,
        readAt: new Date(),
        createdAt: new Date(),
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: userId,
        email: 'student@example.test',
        fullName: 'Jane Doe',
      }),
    },
  };

  const service = new NotificationsService(prisma as never, emailQueue as never);

  return { service, prisma, emailQueue };
}

describe('Epic NOTIF-01: Multi-Tenant Notifications & Delivery Queue (Th6-I401..Th6-I407)', () => {
  it('Th6-I401 & Th6-I404: dispatches event notification and enqueues background email', async () => {
    const { service, prisma, emailQueue } = setupNotificationsEpicTest();
    const result = await service.notify({
      userId,
      email: 'student@example.test',
      kind: 'OPPORTUNITY',
      title: 'New Campus Placement Drive',
      body: 'Acme Corp is hiring Fullstack Engineers.',
      emailTemplate: 'welcome',
      emailData: { fullName: 'Jane Doe', inviteLink: 'https://test.link' },
    });

    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId,
          kind: 'OPPORTUNITY',
        }),
      }),
    );
    expect(emailQueue.add).toHaveBeenCalled();
    expect(result).toHaveProperty('notificationId', notificationId);
  });

  it('Th6-I402: lists in-app notifications and unread count', async () => {
    const { service, prisma } = setupNotificationsEpicTest();
    const response = await service.listForUser(userId);

    expect(response.notifications).toHaveLength(1);
    expect(response.unreadCount).toBe(1);
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId } }),
    );
  });

  it('Th6-I402: marks in-app notification as read', async () => {
    const { service, prisma } = setupNotificationsEpicTest();
    const updated = await service.markRead(userId, notificationId);

    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: notificationId },
        data: expect.objectContaining({ readAt: expect.any(Date) }),
      }),
    );
    expect(updated.readAt).toBeDefined();
  });

  it('Th6-I406 & Th6-I407: enqueues security alert or roster update email', async () => {
    const { service, emailQueue } = setupNotificationsEpicTest();
    await service.notify({
      userId,
      email: 'student@example.test',
      kind: 'VERIFICATION_RESULT',
      title: 'Account Hold Update',
      body: 'Your account status has been updated.',
      emailTemplate: 'welcome',
      emailData: { fullName: 'Jane Doe', inviteLink: 'https://test.link' },
    });

    expect(emailQueue.add).toHaveBeenCalledWith(
      'send',
      expect.objectContaining({
        to: 'student@example.test',
        template: 'welcome',
      }),
    );
  });
});
