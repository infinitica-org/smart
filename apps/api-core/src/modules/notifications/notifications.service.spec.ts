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

  it('CO-T05: sends distinct title/body copy per target stage, not one generic message', async () => {
    const stages = ['AI_VERIFIED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN'] as const;
    const seen: { stage: string; title: string; body: string }[] = [];

    for (const toStage of stages) {
      const prisma = {
        notification: {
          create: vi.fn(({ data }: { data: { title: string; body: string; kind: string } }) =>
            Promise.resolve({
              id: randomUUID(),
              kind: data.kind,
              title: data.title,
              body: data.body,
              linkUrl: null,
              readAt: null,
              createdAt: new Date('2026-09-05T00:00:00.000Z'),
            }),
          ),
        },
      };
      const emailQueue = { add: vi.fn().mockResolvedValue(undefined) };
      const service = new NotificationsService(prisma as never, emailQueue as never);

      const dto = await service.notifyStageChange({
        userId: randomUUID(),
        email: 'student@smart.local',
        fullName: 'Alex Student',
        companyName: 'Infinitica Labs',
        roleTitle: 'Backend Engineer',
        fromStage: 'SHORTLISTED',
        toStage,
        applicationId: randomUUID(),
      });

      expect(dto.kind).toBe('STAGE_CHANGE');
      expect(dto.title).toContain('Backend Engineer');
      seen.push({ stage: toStage, title: dto.title, body: dto.body });
    }

    const titles = new Set(seen.map((row) => row.title));
    const bodies = new Set(seen.map((row) => row.body));
    expect(titles.size).toBe(stages.length);
    expect(bodies.size).toBe(stages.length);
  });

  it('notifyCompanyVerification sends distinct copy for approved vs rejected', async () => {
    const outcomes = ['APPROVED', 'REJECTED'] as const;
    const seen: { decision: string; template: unknown; title: string }[] = [];

    for (const decision of outcomes) {
      const prisma = {
        notification: {
          create: vi.fn(({ data }: { data: { title: string; body: string; kind: string } }) =>
            Promise.resolve({
              id: randomUUID(),
              kind: data.kind,
              title: data.title,
              body: data.body,
              linkUrl: null,
              readAt: null,
              createdAt: new Date('2026-09-23T00:00:00.000Z'),
            }),
          ),
        },
      };
      const emailQueue = { add: vi.fn().mockResolvedValue(undefined) };
      const service = new NotificationsService(prisma as never, emailQueue as never);

      const dto = await service.notifyCompanyVerification({
        userId: randomUUID(),
        email: 'admin@acme.com',
        fullName: 'Admin Acme',
        companyName: 'Acme',
        decision,
        reason: 'GSTIN missing',
      });

      expect(dto.kind).toBe('VERIFICATION_RESULT');
      expect(dto.title).toContain('Acme');
      const [, emailArgs] = emailQueue.add.mock.calls[0] as [string, { template: unknown }];
      seen.push({ decision, template: emailArgs.template, title: dto.title });
    }

    expect(seen[0]?.template).toBe('company-verification-approved');
    expect(seen[1]?.template).toBe('company-verification-rejected');
    expect(seen[0]?.title).not.toBe(seen[1]?.title);
  });
});
