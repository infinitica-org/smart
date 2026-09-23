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
      workExperienceManagerEndorsement: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      workExperience: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    processor = new EmailProcessor(mailer, prisma);
  });

  it('processes send-reminder job and reschedules next reminder if > 6 hours remain', async () => {
    const attemptId = randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 3600 * 1000); // 30 hours remaining

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

    expect(mailer.send).toHaveBeenCalledWith({
      to: 'hr@acme.com',
      template: 'work-experience-verifier-reminder',
      data: { candidateName: 'Alice' },
    });
    expect(prisma.workExperienceVerificationAttempt.update).toHaveBeenCalledWith({
      where: { id: attemptId },
      data: { reminderSentAt: expect.any(Date) },
    });
    expect(mockQueueAdd).toHaveBeenCalledWith(
      'send-reminder',
      expect.objectContaining({
        attemptId,
        to: 'hr@acme.com',
      }),
      { delay: 6 * 60 * 60 * 1000 },
    );
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

  it('processes expire-verification job and marks status as EXPIRED if pending', async () => {
    const attemptId = randomUUID();
    const expId = randomUUID();

    prisma.workExperienceVerificationAttempt.findUnique.mockResolvedValueOnce({
      id: attemptId,
      respondedAt: null,
    });

    prisma.workExperience.findUnique.mockResolvedValueOnce({
      id: expId,
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
  });

  it('processes send-manager-reminder job and updates reminderSentAt ONLY after mailer dispatch succeeds', async () => {
    const endorsementId = randomUUID();
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000); // 48h remaining

    prisma.workExperienceManagerEndorsement.findUnique.mockResolvedValueOnce({
      id: endorsementId,
      respondedAt: null,
      expiresAt,
    });
    prisma.workExperienceManagerEndorsement.update.mockResolvedValueOnce({});

    const mockJob: any = {
      name: 'send-manager-reminder',
      data: {
        endorsementId,
        to: 'manager@acme.com',
        template: 'work-experience-manager-reminder',
        data: { candidateName: 'John Doe', surveyUrl: 'https://verify.smart.app/survey/123' },
      },
    };

    await processor.process(mockJob);

    expect(mailer.send).toHaveBeenCalledWith({
      to: 'manager@acme.com',
      template: 'work-experience-manager-reminder',
      data: { candidateName: 'John Doe', surveyUrl: 'https://verify.smart.app/survey/123' },
    });

    expect(prisma.workExperienceManagerEndorsement.update).toHaveBeenCalledWith({
      where: { id: endorsementId },
      data: { reminderSentAt: expect.any(Date) },
    });
  });

  it('does NOT dispatch email or update reminderSentAt if manager endorsement has already responded or expired', async () => {
    const endorsementId = randomUUID();

    prisma.workExperienceManagerEndorsement.findUnique.mockResolvedValueOnce({
      id: endorsementId,
      respondedAt: new Date(),
      expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
    });

    const mockJob: any = {
      name: 'send-manager-reminder',
      data: {
        endorsementId,
        to: 'manager@acme.com',
        template: 'work-experience-manager-reminder',
        data: { candidateName: 'John Doe' },
      },
    };

    await processor.process(mockJob);

    expect(mailer.send).not.toHaveBeenCalled();
    expect(prisma.workExperienceManagerEndorsement.update).not.toHaveBeenCalled();
  });
});
