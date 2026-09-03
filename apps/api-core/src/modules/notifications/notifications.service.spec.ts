import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { NotificationsService } from './notifications.service.js';

describe('NotificationsService', () => {
  it('creates in-app notification and enqueues email', async () => {
    const userId = randomUUID();
    const createdAt = new Date('2026-09-02T10:00:00.000Z');
    const prisma = {
      notification: {
        create: vi.fn().mockResolvedValue({
          id: randomUUID(),
          kind: 'OPPORTUNITY',
          title: 'Shortlisted for Backend Engineer',
          body: 'You have been shortlisted.',
          linkUrl: 'http://localhost:3001/applications',
          readAt: null,
          createdAt,
        }),
      },
    };
    const emailQueue = {
      add: vi.fn().mockResolvedValue(undefined),
    };

    const service = new NotificationsService(prisma as never, emailQueue as never);
    const dto = await service.notifyOpportunityShortlisted({
      userId,
      email: 'student@smart.local',
      fullName: 'Alex Student',
      companyName: 'Infinitica Labs',
      roleTitle: 'Backend Engineer',
      applicationId: randomUUID(),
      openingId: randomUUID(),
    });

    expect(prisma.notification.create).toHaveBeenCalledOnce();
    expect(emailQueue.add).toHaveBeenCalledOnce();
    expect(dto.kind).toBe('OPPORTUNITY');
    expect(dto.title).toContain('Backend Engineer');
  });
});
