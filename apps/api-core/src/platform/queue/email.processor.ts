import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import type { Job } from 'bullmq';
import { EvidenceSyncService } from '../../modules/evidence/evidence-sync.service.js';
import { MailerService } from '../mailer/mailer.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  EMAIL_QUEUE,
  type EmailJobPayload,
  type EmailQueueJobData,
  type WorkExperienceExpireJobPayload,
  type WorkExperienceReminderJobPayload,
  type WorkExperienceManagerReminderJobPayload,
  type WorkExperienceManagerExpireJobPayload,
} from '../mailer/mailer.types.js';

@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  constructor(
    @Inject(MailerService) private readonly mailer: MailerService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EvidenceSyncService) private readonly evidenceSync: EvidenceSyncService,
  ) {
    super();
  }

  async process(job: Job<EmailQueueJobData>): Promise<void> {
    if (job.name === 'send-reminder') {
      const payload = job.data as WorkExperienceReminderJobPayload;
      const { attemptId, to, template, data } = payload;
      if (attemptId) {
        const attempt = await this.prisma.workExperienceVerificationAttempt.findUnique({
          where: { id: attemptId },
        });
        if (attempt && attempt.respondedAt === null && attempt.expiresAt > new Date()) {
          await this.mailer.send({ to, template, data });
          await this.prisma.workExperienceVerificationAttempt.update({
            where: { id: attemptId },
            data: { reminderSentAt: new Date() },
          });

          const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
          const remainingMs = attempt.expiresAt.getTime() - Date.now();
          if (remainingMs > SIX_HOURS_MS) {
            const hoursLeft = Math.max(
              1,
              Math.round((remainingMs - SIX_HOURS_MS) / (60 * 60 * 1000)),
            );
            const jobQueue = (
              job as unknown as {
                queue?: { add: (name: string, data: unknown, opts: unknown) => Promise<unknown> };
              }
            ).queue;
            if (jobQueue && typeof jobQueue.add === 'function') {
              await jobQueue.add(
                'send-reminder',
                {
                  ...payload,
                  data: {
                    ...data,
                    expiresAtFormatted: `${hoursLeft} hours`,
                  },
                } as WorkExperienceReminderJobPayload,
                { delay: SIX_HOURS_MS },
              );
            }
          }
        }
      }
      return;
    }

    if (job.name === 'expire-verification') {
      const payload = job.data as WorkExperienceExpireJobPayload;
      const { attemptId, experienceId } = payload;
      if (attemptId && experienceId) {
        const attempt = await this.prisma.workExperienceVerificationAttempt.findUnique({
          where: { id: attemptId },
        });
        if (attempt && attempt.respondedAt === null) {
          const exp = await this.prisma.workExperience.findUnique({
            where: { id: experienceId },
          });
          if (exp && exp.status === 'PENDING_EMPLOYER') {
            await this.prisma.workExperience.update({
              where: { id: experienceId },
              data: { status: 'EXPIRED' },
            });
            await this.evidenceSync.syncWorkExperienceEvidenceRecord(exp.studentId, experienceId);
          }
        }
      }
      return;
    }

    if (job.name === 'send-manager-reminder') {
      const payload = job.data as WorkExperienceManagerReminderJobPayload;
      const { endorsementId, to, template, data } = payload;
      if (endorsementId) {
        const endorsement = await this.prisma.workExperienceManagerEndorsement.findUnique({
          where: { id: endorsementId },
        });
        if (endorsement && endorsement.respondedAt === null && endorsement.expiresAt > new Date()) {
          await this.mailer.send({ to, template, data });
          await this.prisma.workExperienceManagerEndorsement.update({
            where: { id: endorsementId },
            data: { reminderSentAt: new Date() },
          });
        }
      }
      return;
    }

    if (job.name === 'expire-manager-endorsement') {
      const payload = job.data as WorkExperienceManagerExpireJobPayload;
      const { endorsementId } = payload;
      if (endorsementId) {
        const endorsement = await this.prisma.workExperienceManagerEndorsement.findUnique({
          where: { id: endorsementId },
        });
        if (endorsement && endorsement.respondedAt === null) {
          await this.prisma.workExperienceManagerEndorsement.update({
            where: { id: endorsementId },
            data: { status: 'EXPIRED' },
          });
        }
      }
      return;
    }

    await this.mailer.send(job.data as EmailJobPayload);
  }
}
