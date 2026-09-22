import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailProcessor } from './email.processor.js';
import type {
  WorkExperienceReminderJobPayload,
  WorkExperienceExpireJobPayload,
} from '../mailer/mailer.types.js';

describe('EmailProcessor', () => {
  let mailer: any;
  let prisma: any;
  let evidenceSync: any;
  let processor: EmailProcessor;

  beforeEach(() => {
    mailer = {
      send: vi.fn().mockResolvedValue(undefined),
    };
    prisma = {
      workExperienceVerificationAttempt: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      workExperience: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };
    evidenceSync = {
      syncWorkExperienceEvidenceRecord: vi.fn().mockResolvedValue(undefined),
    };

    processor = new EmailProcessor(mailer, prisma, evidenceSync);
  });

  it('processes send-reminder job and reschedules next reminder if > 6 hours remain', async () => {
    const attemptId = randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 3600 * 1000);

    prisma.workExperienceVerificationAttempt.findUnique.mockResolvedValueOnce({
      id: attemptId,
      respondedAt: null,
      expiresAt,
    });
    prisma.workExperienceVerificationAttempt.update.mockResolvedValueOnce({});

    const mockQueueAdd = vi.fn().mockResolvedValue(undefined);
    const mockJob: any = {
      name: 'send-reminder',
      data: {
        attemptId,
        to: 'hr@acme.com',
        template: 'work-experience-verifier-reminder',
        data: { candidateName: 'Alice' },
      } as WorkExperienceReminderJobPayload,
      queue: {
        add: mockQueueAdd,
      },
    };

    await processor.process(mockJob);

    expect(mailer.send).toHaveBeenCalled();
    expect(mockQueueAdd).toHaveBeenCalled();
  });

  it('does NOT reschedule reminder if attempt has responded or expired', async () => {
    const attemptId = randomUUID();
    prisma.workExperienceVerificationAttempt.findUnique.mockResolvedValueOnce({
      id: attemptId,
      respondedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 3600 * 1000),
    });

    const mockQueueAdd = vi.fn();
    const mockJob: any = {
      name: 'send-reminder',
      data: { attemptId, to: 'hr@acme.com' } as WorkExperienceReminderJobPayload,
      queue: { add: mockQueueAdd },
    };

    await processor.process(mockJob);

    expect(mailer.send).not.toHaveBeenCalled();
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('13–15. expire-verification transitions WorkExperience and syncs evidence', async () => {
    const attemptId = randomUUID();
    const expId = randomUUID();
    const studentId = randomUUID();

    prisma.workExperienceVerificationAttempt.findUnique.mockResolvedValueOnce({
      id: attemptId,
      respondedAt: null,
    });

    prisma.workExperience.findUnique.mockResolvedValueOnce({
      id: expId,
      studentId,
      status: 'PENDING_EMPLOYER',
    });

    prisma.workExperience.update.mockResolvedValueOnce({
      id: expId,
      status: 'EXPIRED',
    });

    const mockJob: any = {
      name: 'expire-verification',
      data: { attemptId, experienceId: expId } as WorkExperienceExpireJobPayload,
    };

    await processor.process(mockJob);

    expect(prisma.workExperience.update).toHaveBeenCalledWith({
      where: { id: expId },
      data: { status: 'EXPIRED' },
    });
    expect(evidenceSync.syncWorkExperienceEvidenceRecord).toHaveBeenCalledWith(studentId, expId);
  });

  it('does not sync evidence when WorkExperience was not pending employer', async () => {
    const attemptId = randomUUID();
    const expId = randomUUID();

    prisma.workExperienceVerificationAttempt.findUnique.mockResolvedValueOnce({
      id: attemptId,
      respondedAt: null,
    });

    prisma.workExperience.findUnique.mockResolvedValueOnce({
      id: expId,
      studentId: randomUUID(),
      status: 'VERIFIED',
    });

    const mockJob: any = {
      name: 'expire-verification',
      data: { attemptId, experienceId: expId } as WorkExperienceExpireJobPayload,
    };

    await processor.process(mockJob);

    expect(prisma.workExperience.update).not.toHaveBeenCalled();
    expect(evidenceSync.syncWorkExperienceEvidenceRecord).not.toHaveBeenCalled();
  });
});
