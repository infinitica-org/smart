import { randomUUID } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ApplicationsService } from './applications.service.js';

describe('ApplicationsService', () => {
  it('publishes stage-changed event when creating a shortlisted application', async () => {
    const institutionId = randomUUID();
    const openingId = randomUUID();
    const studentId = randomUUID();
    const applicationId = randomUUID();

    const prisma = {
      jobOpening: {
        findFirst: vi.fn().mockResolvedValue({
          id: openingId,
          institutionId,
          companyName: 'Infinitica Labs',
          roleTitle: 'Backend Engineer',
        }),
      },
      user: {
        findFirst: vi.fn().mockResolvedValue({
          id: studentId,
          email: 'student@smart.local',
          fullName: 'Alex Student',
        }),
      },
      application: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: applicationId,
          openingId,
          studentId,
          stage: 'SHORTLISTED',
          matchScore: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
    };
    const outbox = { enqueueEnvelope: vi.fn().mockResolvedValue(undefined) };

    const service = new ApplicationsService(prisma as never, outbox as never);
    const dto = await service.createApplication(institutionId, {
      openingId,
      studentId,
      stage: 'SHORTLISTED',
    });

    expect(dto.applicationId).toBe(applicationId);
    expect(outbox.enqueueEnvelope).toHaveBeenCalledOnce();
    expect(outbox.enqueueEnvelope.mock.calls[0]?.[0]?.topic).toBe(
      'smart.application.stage_changed',
    );
  });

  it('rejects duplicate applications', async () => {
    const institutionId = randomUUID();
    const openingId = randomUUID();
    const studentId = randomUUID();
    const prisma = {
      jobOpening: {
        findFirst: vi.fn().mockResolvedValue({ id: openingId, institutionId }),
      },
      user: {
        findFirst: vi.fn().mockResolvedValue({ id: studentId }),
      },
      application: {
        findUnique: vi.fn().mockResolvedValue({ id: randomUUID() }),
      },
    };

    const service = new ApplicationsService(prisma as never, { enqueueEnvelope: vi.fn() } as never);

    await expect(
      service.createApplication(institutionId, { openingId, studentId, stage: 'SHORTLISTED' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
