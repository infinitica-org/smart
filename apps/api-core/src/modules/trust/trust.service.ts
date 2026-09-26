import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import {
  AppealStatus,
  EnforcementActionType,
  EnforcementStatus,
  NotificationKind,
  TrustCaseSeverity,
  TrustCaseStatus,
  TrustReportStatus,
} from '../../generated/prisma/index.js';
import type { TrustReportCategory } from '../../generated/prisma/index.js';
import type { PrismaService } from '../../platform/prisma/prisma.service.js';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { SCORE_RECALCULATION_QUEUE } from '../../platform/queue/queue.names.js';
import type {
  ApplyEnforcementRequestDto,
  AssignTrustCaseRequestDto,
  CreateTrustCaseRequestDto,
  ResolveTrustAppealRequestDto,
  ResolveTrustReportRequestDto,
  ReverseEnforcementRequestDto,
  SubmitTrustAppealRequestDto,
  SubmitTrustReportRequestDto,
} from '@smart/contracts';

@Injectable()
export class TrustService {
  private readonly logger = new Logger(TrustService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
    @InjectQueue(SCORE_RECALCULATION_QUEUE) private readonly scoreRecalculationQueue: Queue,
  ) {}

  /* -------------------------------------------------------------------------- */
  /*                             TRUST CASE MANAGEMENT                          */
  /* -------------------------------------------------------------------------- */

  async listCases(filter: {
    status?: TrustCaseStatus;
    severity?: TrustCaseSeverity;
    candidateId?: string;
  }) {
    return this.prisma.trustCase.findMany({
      where: {
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.severity ? { severity: filter.severity } : {}),
        ...(filter.candidateId ? { candidateId: filter.candidateId } : {}),
      },
      include: {
        candidate: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        assignedAdmin: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCase(dto: CreateTrustCaseRequestDto, creatorId?: string) {
    const candidate = await this.prisma.user.findUnique({
      where: { id: dto.candidateId },
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate ${dto.candidateId} not found`);
    }

    const trustCase = await this.prisma.trustCase.create({
      data: {
        candidateId: dto.candidateId,
        severity: dto.severity as TrustCaseSeverity,
        summary: dto.summary,
        status: TrustCaseStatus.OPEN,
      },
      include: {
        candidate: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    await this.auditPublisher.record({
      action: 'trust.case.created',
      actorId: creatorId ?? dto.candidateId,
      resourceType: 'trust_case',
      resourceId: trustCase.id,
      reasonCode: dto.severity,
      metadata: {
        caseId: trustCase.id,
        candidateId: dto.candidateId,
        severity: dto.severity,
        summary: dto.summary,
      },
    });

    return trustCase;
  }

  async getCaseDetail(caseId: string) {
    const trustCase = await this.prisma.trustCase.findUnique({
      where: { id: caseId },
      include: {
        candidate: {
          select: {
            id: true,
            fullName: true,
            email: true,
            publicProfileSlug: true,
          },
        },
        assignedAdmin: {
          select: { id: true, fullName: true, email: true },
        },
        integrityEvents: {
          include: {
            attempt: {
              select: { id: true, startedAt: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        corroborationFlags: {
          orderBy: { createdAt: 'desc' },
        },
        enforcementActions: {
          include: {
            appeals: true,
          },
          orderBy: { appliedAt: 'desc' },
        },
        trustReports: {
          orderBy: { createdAt: 'desc' },
        },
        userAccountHolds: {
          orderBy: { placedAt: 'desc' },
        },
      },
    });

    if (!trustCase) {
      throw new NotFoundException(`Trust case ${caseId} not found`);
    }

    return trustCase;
  }

  async assignCase(caseId: string, dto: AssignTrustCaseRequestDto, adminId: string) {
    const trustCase = await this.prisma.trustCase.findUnique({
      where: { id: caseId },
    });
    if (!trustCase) {
      throw new NotFoundException(`Trust case ${caseId} not found`);
    }

    const updated = await this.prisma.trustCase.update({
      where: { id: caseId },
      data: {
        assignedAdminId: dto.adminId,
        status:
          trustCase.status === TrustCaseStatus.OPEN
            ? TrustCaseStatus.UNDER_INVESTIGATION
            : trustCase.status,
      },
      include: {
        assignedAdmin: { select: { id: true, fullName: true, email: true } },
      },
    });

    await this.auditPublisher.record({
      action: 'trust.case.assigned',
      actorId: adminId,
      resourceType: 'trust_case',
      resourceId: caseId,
      reasonCode: null,
      metadata: { assignedAdminId: dto.adminId },
    });

    return updated;
  }

  /* -------------------------------------------------------------------------- */
  /*                            ENFORCEMENT ENGINE                              */
  /* -------------------------------------------------------------------------- */

  async applyEnforcementAction(caseId: string, dto: ApplyEnforcementRequestDto, adminId: string) {
    const trustCase = await this.prisma.trustCase.findUnique({
      where: { id: caseId },
    });
    if (!trustCase) {
      throw new NotFoundException(`Trust case ${caseId} not found`);
    }

    const actionType = dto.actionType as EnforcementActionType;
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    // Check for existing active enforcement action of the same type on this case
    const existingActive = await this.prisma.enforcementAction.findFirst({
      where: {
        trustCaseId: caseId,
        actionType,
        status: EnforcementStatus.ACTIVE,
      },
    });
    if (existingActive) {
      throw new BadRequestException(
        `An active enforcement action of type ${actionType} already exists for this trust case.`,
      );
    }

    // 1. Create EnforcementAction record
    const enforcement = await this.prisma.enforcementAction.create({
      data: {
        trustCaseId: caseId,
        candidateId: trustCase.candidateId,
        actionType,
        status: EnforcementStatus.ACTIVE,
        reason: dto.reason,
        appliedBy: adminId,
        expiresAt,
        metadata: dto.metadata ?? {},
      },
    });

    // 2. Apply Domain Sanctions
    if (
      actionType === EnforcementActionType.RESTRICT_ASSESSMENTS ||
      actionType === EnforcementActionType.SUSPEND_VERIFICATION ||
      actionType === EnforcementActionType.BAN_ACCOUNT
    ) {
      // Create user account hold
      await this.prisma.userAccountHold.create({
        data: {
          userId: trustCase.candidateId,
          trustCaseId: caseId,
          reason: dto.reason,
          placedBy: adminId,
          expiresAt,
        },
      });

      // Update User held fields
      await this.prisma.user.update({
        where: { id: trustCase.candidateId },
        data: {
          heldAt: new Date(),
          heldReason: dto.reason,
        },
      });
    }

    // Update case status to ACTION_TAKEN
    await this.prisma.trustCase.update({
      where: { id: caseId },
      data: { status: TrustCaseStatus.ACTION_TAKEN },
    });

    // 3. Dispatch Async Score Recalculation
    await this.scoreRecalculationQueue.add('recalculate_post_enforcement', {
      candidateId: trustCase.candidateId,
      reason: `Enforcement applied: ${actionType}`,
      enforcementActionId: enforcement.id,
    });

    // 4. Send Notification to Candidate
    await this.prisma.notification.create({
      data: {
        userId: trustCase.candidateId,
        kind: NotificationKind.TRUST_ENFORCEMENT,
        title: `Account Notice: ${actionType.replace('_', ' ')}`,
        body: `An administrative action (${actionType}) was applied to your account. Reason: ${dto.reason}`,
      },
    });

    // 5. Audit Log
    await this.auditPublisher.record({
      action: 'trust.enforcement.applied',
      actorId: adminId,
      resourceType: 'enforcement_action',
      resourceId: enforcement.id,
      reasonCode: actionType,
      metadata: {
        caseId,
        candidateId: trustCase.candidateId,
        actionType,
        reason: dto.reason,
      },
    });

    return enforcement;
  }

  async reverseEnforcementAction(
    enforcementId: string,
    dto: ReverseEnforcementRequestDto,
    adminId: string,
  ) {
    const enforcement = await this.prisma.enforcementAction.findUnique({
      where: { id: enforcementId },
    });
    if (!enforcement) {
      throw new NotFoundException(`Enforcement action ${enforcementId} not found`);
    }

    if (enforcement.status !== EnforcementStatus.ACTIVE) {
      throw new BadRequestException(
        `Enforcement action is not active (current status: ${enforcement.status})`,
      );
    }

    // 1. Mark EnforcementAction as REVERSED
    const updated = await this.prisma.enforcementAction.update({
      where: { id: enforcementId },
      data: {
        status: EnforcementStatus.REVERSED,
        reversedAt: new Date(),
        reversedBy: adminId,
        reversalReason: dto.reversalReason,
      },
    });

    // 2. Lift Account Holds linked to this candidate / case
    const activeHolds = await this.prisma.userAccountHold.findMany({
      where: {
        userId: enforcement.candidateId,
        trustCaseId: enforcement.trustCaseId,
        liftedAt: null,
      },
    });

    for (const hold of activeHolds) {
      await this.prisma.userAccountHold.update({
        where: { id: hold.id },
        data: {
          liftedAt: new Date(),
          liftedBy: adminId,
          liftReason: dto.reversalReason,
        },
      });
    }

    // Check if any active holds remain for this user
    const remainingHolds = await this.prisma.userAccountHold.count({
      where: { userId: enforcement.candidateId, liftedAt: null },
    });

    if (remainingHolds === 0) {
      await this.prisma.user.update({
        where: { id: enforcement.candidateId },
        data: {
          heldAt: null,
          heldReason: null,
        },
      });
    }

    // 3. Dispatch Async Score Recalculation
    await this.scoreRecalculationQueue.add('recalculate_post_reversal', {
      candidateId: enforcement.candidateId,
      reason: `Enforcement reversed: ${enforcement.actionType}`,
      enforcementActionId: enforcement.id,
    });

    // 4. Send Notification
    await this.prisma.notification.create({
      data: {
        userId: enforcement.candidateId,
        kind: NotificationKind.TRUST_ENFORCEMENT,
        title: 'Sanction Lifted',
        body: `The administrative action on your account has been lifted. Reason: ${dto.reversalReason}`,
      },
    });

    // 5. Audit Log
    await this.auditPublisher.record({
      action: 'trust.enforcement.reversed',
      actorId: adminId,
      resourceType: 'enforcement_action',
      resourceId: enforcementId,
      reasonCode: null,
      metadata: {
        reversalReason: dto.reversalReason,
      },
    });

    return updated;
  }

  async forceScoreRecalculation(candidateId: string, adminId: string) {
    const candidate = await this.prisma.user.findUnique({
      where: { id: candidateId },
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate ${candidateId} not found`);
    }

    await this.scoreRecalculationQueue.add('manual_score_recalculation', {
      candidateId,
      reason: `Manually triggered by admin ${adminId}`,
    });

    await this.auditPublisher.record({
      action: 'trust.score.recalculation_triggered',
      actorId: adminId,
      resourceType: 'user',
      resourceId: candidateId,
      reasonCode: null,
      metadata: { triggeredAt: new Date().toISOString() },
    });

    return { success: true, message: `Score recalculation queued for candidate ${candidateId}` };
  }

  /* -------------------------------------------------------------------------- */
  /*                               APPEALS WORKFLOW                             */
  /* -------------------------------------------------------------------------- */

  async submitAppeal(dto: SubmitTrustAppealRequestDto, candidateId: string) {
    const enforcement = await this.prisma.enforcementAction.findUnique({
      where: { id: dto.enforcementActionId },
    });
    if (!enforcement) {
      throw new NotFoundException(`Enforcement action ${dto.enforcementActionId} not found`);
    }

    if (enforcement.candidateId !== candidateId) {
      throw new BadRequestException('You can only appeal enforcement actions on your own account');
    }

    const appeal = await this.prisma.trustAppeal.create({
      data: {
        enforcementActionId: dto.enforcementActionId,
        candidateId,
        reason: dto.reason,
        supportingDocKeys: dto.supportingDocKeys ?? [],
        status: AppealStatus.SUBMITTED,
      },
    });

    await this.auditPublisher.record({
      action: 'trust.appeal.submitted',
      actorId: candidateId,
      resourceType: 'trust_appeal',
      resourceId: appeal.id,
      reasonCode: null,
      metadata: {
        enforcementActionId: dto.enforcementActionId,
        reason: dto.reason,
      },
    });

    return appeal;
  }

  async listAppeals(filter: { status?: AppealStatus }) {
    return this.prisma.trustAppeal.findMany({
      where: filter.status ? { status: filter.status } : {},
      include: {
        candidate: { select: { id: true, fullName: true, email: true } },
        enforcementAction: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async resolveAppeal(appealId: string, dto: ResolveTrustAppealRequestDto, adminId: string) {
    const appeal = await this.prisma.trustAppeal.findUnique({
      where: { id: appealId },
      include: { enforcementAction: true },
    });
    if (!appeal) {
      throw new NotFoundException(`Appeal ${appealId} not found`);
    }

    const decisionStatus = dto.decision === 'UPHELD' ? AppealStatus.UPHELD : AppealStatus.REJECTED;

    const updated = await this.prisma.trustAppeal.update({
      where: { id: appealId },
      data: {
        status: decisionStatus,
        reviewedBy: adminId,
        reviewNotes: dto.reviewNotes,
        resolvedAt: new Date(),
      },
    });

    // If appeal is UPHELD, reverse the underlying enforcement action automatically
    if (decisionStatus === AppealStatus.UPHELD) {
      await this.reverseEnforcementAction(
        appeal.enforcementActionId,
        { reversalReason: `Appeal ${appealId} upheld: ${dto.reviewNotes}` },
        adminId,
      );
    } else {
      // Notify candidate of rejected appeal
      await this.prisma.notification.create({
        data: {
          userId: appeal.candidateId,
          kind: NotificationKind.TRUST_ENFORCEMENT,
          title: 'Appeal Decision',
          body: `Your appeal regarding the enforcement action was reviewed and rejected. Notes: ${dto.reviewNotes}`,
        },
      });
    }

    await this.auditPublisher.record({
      action: 'trust.appeal.resolved',
      actorId: adminId,
      resourceType: 'trust_appeal',
      resourceId: appealId,
      reasonCode: dto.decision,
      metadata: { decision: dto.decision, reviewNotes: dto.reviewNotes },
    });

    return updated;
  }

  /* -------------------------------------------------------------------------- */
  /*                              REPORTING INTAKE                              */
  /* -------------------------------------------------------------------------- */

  async submitReport(dto: SubmitTrustReportRequestDto, reporterId?: string) {
    const report = await this.prisma.trustReport.create({
      data: {
        reporterId,
        reporterEmail: dto.reporterEmail,
        targetUserId: dto.targetUserId,
        targetResourceType: dto.targetResourceType,
        targetResourceId: dto.targetResourceId,
        category: (dto.category ?? 'OTHER') as TrustReportCategory,
        description: dto.description,
        evidenceUrls: dto.evidenceUrls ?? [],
        status: TrustReportStatus.RECEIVED,
      },
    });

    await this.auditPublisher.record({
      action: 'trust.report.submitted',
      actorId: reporterId ?? null,
      resourceType: 'trust_report',
      resourceId: report.id,
      reasonCode: dto.category ?? 'OTHER',
      metadata: {
        targetUserId: dto.targetUserId,
        category: dto.category,
      },
    });

    return report;
  }

  async listReports(filter: { status?: TrustReportStatus; category?: TrustReportCategory }) {
    return this.prisma.trustReport.findMany({
      where: {
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.category ? { category: filter.category } : {}),
      },
      include: {
        reporter: { select: { id: true, fullName: true, email: true } },
        targetUser: { select: { id: true, fullName: true, email: true } },
        trustCase: { select: { id: true, status: true, severity: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveReport(reportId: string, dto: ResolveTrustReportRequestDto, adminId: string) {
    const report = await this.prisma.trustReport.findUnique({
      where: { id: reportId },
    });
    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }

    let trustCaseId = report.trustCaseId;

    if (dto.createTrustCase && report.targetUserId) {
      const newCase = await this.createCase(
        {
          candidateId: report.targetUserId,
          severity: TrustCaseSeverity.MEDIUM,
          summary: `Generated from Abuse Report ${reportId}: ${dto.resolutionSummary}`,
        },
        adminId,
      );
      trustCaseId = newCase.id;
    }

    const updated = await this.prisma.trustReport.update({
      where: { id: reportId },
      data: {
        status: dto.status as TrustReportStatus,
        resolutionSummary: dto.resolutionSummary,
        resolvedAt: new Date(),
        trustCaseId,
      },
    });

    await this.auditPublisher.record({
      action: 'trust.report.resolved',
      actorId: adminId,
      resourceType: 'trust_report',
      resourceId: reportId,
      reasonCode: dto.status,
      metadata: { status: dto.status, resolutionSummary: dto.resolutionSummary, trustCaseId },
    });

    return updated;
  }

  /* -------------------------------------------------------------------------- */
  /*                       PROFILE ACCESS & SUSPICIOUS BEHAVIOR                 */
  /* -------------------------------------------------------------------------- */

  async logProfileAccess(
    candidateId: string,
    viewerId: string | undefined,
    viewerIp: string,
    userAgent: string | undefined,
    accessedSlug: string,
  ) {
    const log = await this.prisma.profileAccessLog.create({
      data: {
        candidateId,
        viewerId,
        viewerIp,
        userAgent,
        accessedSlug,
      },
    });

    // Check rate limit / suspicious threshold (e.g., >30 hits in last 10 mins from same IP)
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    const RecentCount = await this.prisma.profileAccessLog.count({
      where: {
        viewerIp,
        createdAt: { gte: tenMinsAgo },
      },
    });

    if (RecentCount > 30) {
      this.logger.warn(
        `High profile access frequency detected from IP ${viewerIp} on candidate ${candidateId} (${RecentCount} hits in 10 mins)`,
      );
      // Auto-create/update trust case for suspicious scraping/harvesting if candidate exists
      const existingCase = await this.prisma.trustCase.findFirst({
        where: { candidateId, status: TrustCaseStatus.OPEN },
      });

      if (!existingCase) {
        await this.createCase(
          {
            candidateId,
            severity: TrustCaseSeverity.LOW,
            summary: `Automated alert: High-frequency profile access (${RecentCount} requests in 10m from IP ${viewerIp})`,
          },
          'SYSTEM',
        );
      }
    }

    return log;
  }

  /* -------------------------------------------------------------------------- */
  /*                           CANDIDATE NOTIFICATIONS                           */
  /* -------------------------------------------------------------------------- */

  async getUserTrustNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        kind: NotificationKind.TRUST_ENFORCEMENT,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markNotificationRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }
}
