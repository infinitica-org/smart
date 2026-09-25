import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import type {
  AtsStage,
  ListNotificationsResponse,
  NotificationDto,
  NotificationKind,
} from '@smart/contracts';
import { env } from '../../platform/config/env.js';
import {
  EMAIL_QUEUE,
  type EmailJobPayload,
  type EmailTemplateName,
  type EmailTemplateData,
} from '../../platform/mailer/mailer.types.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import type { Prisma } from '../../generated/prisma/index.js';

export interface NotifyParams {
  readonly userId: string;
  /** Without an email template the notification is in-app only. */
  readonly email?: string;
  readonly kind: NotificationKind;
  readonly title: string;
  readonly body: string;
  readonly linkUrl?: string | null;
  readonly emailTemplate?: EmailTemplateName;
  readonly emailData?: EmailTemplateData;
  readonly metadata?: Record<string, unknown>;
  /** One notification per event: a second call with the same key returns the first and sends nothing. */
  readonly dedupeKey?: string;
}

/**
 * SE-T07 notification service: persists in-app notifications and enqueues email delivery.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue<EmailJobPayload>,
  ) {}

  async notify(params: NotifyParams): Promise<NotificationDto> {
    if (params.dedupeKey) {
      const existing = await this.prisma.notification.findUnique({
        where: { dedupeKey: params.dedupeKey },
      });
      if (existing) return toNotificationDto(existing);
    }

    let row;
    try {
      row = await this.prisma.notification.create({
        data: {
          userId: params.userId,
          kind: params.kind,
          title: params.title,
          body: params.body,
          linkUrl: params.linkUrl ?? null,
          dedupeKey: params.dedupeKey ?? null,
          metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (error) {
      // A concurrent call with the same key won the race: return its row and send no second email.
      if (params.dedupeKey && (error as { code?: string }).code === 'P2002') {
        const raced = await this.prisma.notification.findUnique({
          where: { dedupeKey: params.dedupeKey },
        });
        if (raced) return toNotificationDto(raced);
      }
      throw error;
    }

    if (params.email && params.emailTemplate && params.emailData) {
      await this.emailQueue.add('send', {
        to: params.email,
        template: params.emailTemplate,
        data: params.emailData,
      });
    }

    this.logger.log(`Notification queued for user ${params.userId} (${params.kind})`);
    return toNotificationDto(row);
  }

  /** APP-01 (Th6-389): confirmation to the student, once per application. */
  async notifyApplicationSubmitted(params: {
    userId: string;
    email: string;
    fullName: string;
    companyName: string;
    roleTitle: string;
    applicationId: string;
    referenceNumber: string;
  }): Promise<NotificationDto> {
    const applicationsUrl = `${env.STUDENT_APP_URL}/applications`;
    return this.notify({
      userId: params.userId,
      email: params.email,
      kind: 'APPLICATION',
      title: `Application submitted: ${params.roleTitle}`,
      body: `Your application for ${params.roleTitle} at ${params.companyName} was submitted (reference ${params.referenceNumber}).`,
      linkUrl: applicationsUrl,
      dedupeKey: `application:${params.applicationId}:submitted`,
      emailTemplate: 'application-submitted',
      emailData: {
        fullName: params.fullName,
        companyName: params.companyName,
        roleTitle: params.roleTitle,
        referenceNumber: params.referenceNumber,
        applicationsUrl,
      },
      metadata: { applicationId: params.applicationId },
    });
  }

  /** APP-01 (Th6-387/393): tell one company member about a new or withdrawn applicant, once each. */
  async notifyEmployerApplicant(params: {
    kind: 'received' | 'withdrawn';
    userId: string;
    email: string;
    recipientName: string;
    candidateName: string;
    roleTitle: string;
    applicationId: string;
    openingId: string;
  }): Promise<NotificationDto> {
    const applicantsUrl = `${env.COMPANY_APP_URL}/jobs/${params.openingId}/applicants`;
    const received = params.kind === 'received';
    return this.notify({
      userId: params.userId,
      email: params.email,
      kind: 'APPLICATION',
      title: received
        ? `New applicant for ${params.roleTitle}`
        : `Applicant withdrew from ${params.roleTitle}`,
      body: received
        ? `${params.candidateName} applied for ${params.roleTitle}.`
        : `${params.candidateName} withdrew their application for ${params.roleTitle}.`,
      linkUrl: applicantsUrl,
      dedupeKey: `application:${params.applicationId}:employer:${params.kind}:${params.userId}`,
      emailTemplate: received ? 'application-received' : 'application-withdrawn',
      emailData: {
        recipientName: params.recipientName,
        candidateName: params.candidateName,
        roleTitle: params.roleTitle,
        applicantsUrl,
      },
      metadata: { applicationId: params.applicationId, openingId: params.openingId },
    });
  }

  async listForUser(userId: string, limit = 50): Promise<ListNotificationsResponse> {
    const [rows, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.notification.count({
        where: { userId, readAt: null },
      }),
    ]);

    return {
      notifications: rows.map(toNotificationDto),
      unreadCount,
    };
  }

  async markRead(userId: string, notificationId: string): Promise<NotificationDto> {
    const existing = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Notification not found.',
        statusCode: 404,
      });
    }
    if (existing.readAt) {
      return toNotificationDto(existing);
    }
    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
    return toNotificationDto(updated);
  }

  async notifyOpportunityShortlisted(params: {
    userId: string;
    email: string;
    fullName: string;
    companyName: string;
    roleTitle: string;
    applicationId: string;
    openingId: string;
  }): Promise<NotificationDto> {
    const applicationsUrl = `${env.STUDENT_APP_URL}/applications`;
    const title = `Shortlisted for ${params.roleTitle}`;
    const body = `You have been shortlisted for ${params.roleTitle} at ${params.companyName}.`;
    return this.notify({
      userId: params.userId,
      email: params.email,
      kind: 'OPPORTUNITY',
      title,
      body,
      linkUrl: applicationsUrl,
      emailTemplate: 'opportunity-shortlisted',
      emailData: {
        fullName: params.fullName,
        companyName: params.companyName,
        roleTitle: params.roleTitle,
        applicationsUrl,
      },
      metadata: {
        applicationId: params.applicationId,
        openingId: params.openingId,
      },
    });
  }

  async notifyStageChange(params: {
    userId: string;
    email: string;
    fullName: string;
    companyName: string;
    roleTitle: string;
    fromStage: string | null;
    toStage: AtsStage;
    applicationId: string;
  }): Promise<NotificationDto> {
    const applicationsUrl = `${env.STUDENT_APP_URL}/applications`;
    const copy = STAGE_NOTIFICATION_COPY[params.toStage];
    const title = copy.title(params.roleTitle);
    const body = copy.body(params.roleTitle, params.companyName);
    return this.notify({
      userId: params.userId,
      email: params.email,
      kind: 'STAGE_CHANGE',
      title,
      body,
      linkUrl: applicationsUrl,
      // APP-01: one notification per transition, however many times the event is delivered.
      dedupeKey: `application:${params.applicationId}:status:${params.toStage}`,
      emailTemplate: 'application-stage-changed',
      emailData: {
        fullName: params.fullName,
        companyName: params.companyName,
        roleTitle: params.roleTitle,
        fromStage: params.fromStage,
        toStage: params.toStage,
        applicationsUrl,
      },
      metadata: {
        applicationId: params.applicationId,
        fromStage: params.fromStage,
        toStage: params.toStage,
      },
    });
  }

  async notifyVerificationResult(params: {
    userId: string;
    email: string;
    fullName: string;
    skillName: string;
    status: 'VERIFIED' | 'BEGINNER_REATTEMPT' | 'LOCKED';
    detail: string;
    claimId: string;
  }): Promise<NotificationDto> {
    const profileUrl = `${env.STUDENT_APP_URL}/profile`;
    const templateByStatus: Record<
      typeof params.status,
      { template: EmailTemplateName; title: string; statusLabel: string }
    > = {
      VERIFIED: {
        template: 'verification-passed',
        title: `Skill verified: ${params.skillName}`,
        statusLabel: 'Verified',
      },
      BEGINNER_REATTEMPT: {
        template: 'verification-failed',
        title: `Skill verification update: ${params.skillName}`,
        statusLabel: 'Beginner reattempt required',
      },
      LOCKED: {
        template: 'verification-locked',
        title: `Skill locked: ${params.skillName}`,
        statusLabel: 'Locked for cooldown',
      },
    };
    const copy = templateByStatus[params.status];
    return this.notify({
      userId: params.userId,
      email: params.email,
      kind: 'VERIFICATION_RESULT',
      title: copy.title,
      body: `${params.skillName}: ${copy.statusLabel}. ${params.detail}`,
      linkUrl: profileUrl,
      emailTemplate: copy.template,
      emailData: {
        fullName: params.fullName,
        skillName: params.skillName,
        statusLabel: copy.statusLabel,
        detail: params.detail,
        profileUrl,
      },
      metadata: {
        claimId: params.claimId,
        status: params.status,
      },
    });
  }

  async notifySkillInferenceLevelChange(params: {
    userId: string;
    email: string;
    fullName: string;
    skillCode: string;
    previousLevel: string | null;
    newLevel: string | null;
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
    outcome: 'INFERRED' | 'INSUFFICIENT_EVIDENCE' | 'VETO_BLOCKED';
  }): Promise<NotificationDto> {
    const skillsUrl = `${env.STUDENT_APP_URL}/assessments/skills`;
    const previousLabel = params.previousLevel?.replaceAll('_', ' ').toLowerCase() ?? 'none';
    const newLabel = params.newLevel?.replaceAll('_', ' ').toLowerCase() ?? 'not inferred';
    const title = `Skill evidence update: ${params.skillCode}`;
    const body =
      params.outcome === 'INSUFFICIENT_EVIDENCE'
        ? `Evidence fusion could not infer a level for ${params.skillCode} yet. Add or verify more project evidence.`
        : `Evidence fusion for ${params.skillCode} changed from ${previousLabel} to ${newLabel} (${params.confidence.toLowerCase()} confidence). This is separate from your verified claim level.`;

    return this.notify({
      userId: params.userId,
      email: params.email,
      kind: 'VERIFICATION_RESULT',
      title,
      body,
      linkUrl: skillsUrl,
      emailTemplate: 'verification-passed',
      emailData: {
        fullName: params.fullName,
        skillName: params.skillCode,
        statusLabel: 'Evidence fusion updated',
        detail: body,
        profileUrl: skillsUrl,
      },
      metadata: {
        skillCode: params.skillCode,
        previousLevel: params.previousLevel,
        newLevel: params.newLevel,
        outcome: params.outcome,
      },
    });
  }
}

/**
 * CO-T05: distinct in-app/email copy per CO-T02 kanban column, so a candidate
 * gets a message that matches what actually happened rather than a generic
 * "moved to <Stage>" line for every kind of movement.
 */
const STAGE_NOTIFICATION_COPY: Record<
  AtsStage,
  {
    title: (roleTitle: string) => string;
    body: (roleTitle: string, companyName: string) => string;
  }
> = {
  APPLIED: {
    title: (role) => `Application received: ${role}`,
    body: (role, company) => `Your application for ${role} at ${company} has been recorded.`,
  },
  SHORTLISTED: {
    title: (role) => `Shortlisted for ${role}`,
    body: (role, company) => `You have been shortlisted for ${role} at ${company}.`,
  },
  AI_VERIFIED: {
    title: (role) => `Profile verified: ${role}`,
    body: (role, company) =>
      `Your profile passed AI verification and has been sent to ${company} for ${role}.`,
  },
  INTERVIEW: {
    title: (role) => `Interview stage: ${role}`,
    body: (role, company) =>
      `You have moved to the interviewing stage for ${role} at ${company}. Watch for a scheduling message.`,
  },
  OFFER: {
    title: (role) => `Offer extended: ${role}`,
    body: (role, company) =>
      `Congratulations! You have received an offer for ${role} at ${company}.`,
  },
  HIRED: {
    title: (role) => `You're hired: ${role}`,
    body: (role, company) => `Congratulations, you have been hired for ${role} at ${company}!`,
  },
  REJECTED: {
    title: (role) => `Application update: ${role}`,
    body: (role, company) =>
      `Your application for ${role} at ${company} was not selected this time.`,
  },
  WITHDRAWN: {
    title: (role) => `Application withdrawn: ${role}`,
    body: (role, company) => `Your application for ${role} at ${company} has been withdrawn.`,
  },
};

function toNotificationDto(row: {
  id: string;
  kind: string;
  title: string;
  body: string;
  linkUrl: string | null;
  readAt: Date | null;
  createdAt: Date;
}): NotificationDto {
  return {
    notificationId: row.id,
    kind: row.kind as NotificationDto['kind'],
    title: row.title,
    body: row.body,
    linkUrl: row.linkUrl,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
