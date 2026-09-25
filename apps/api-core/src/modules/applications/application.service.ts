import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  applicationReference,
  canWithdrawFromStage,
  studentStatusLabel,
  toApplicationStatus,
  type ApplicationPreview,
  type ApplyToJobRequest,
  type ApplyToJobResponse,
  type AtsStage,
  type ListStudentApplicationsResponse,
  type StudentApplicationCard,
  type StudentApplicationDetail,
  type WithdrawApplicationRequest,
} from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { IdempotencyService } from '../company-profile/idempotency.service.js';
import { scoreOpeningForStudent, type OpeningFit } from '../matching/opening-fit.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PublicProfileService } from '../public-profile/public-profile.service.js';
import {
  COMPANY_VISIBLE_WHERE,
  isAcceptingApplications,
  isCompanyVerified,
  isJobAllowedForStudent,
} from '../student-jobs/job-eligibility.js';
import { buildSnapshotRecord, type EvidenceRef } from './application-snapshot.js';
import { HiringService, orgIdOf } from './hiring.service.js';
import { STUDENT_TIMELINE_EVENT_SELECT, studentTimeline } from './student-timeline.js';

const JOB_SELECT = {
  id: true,
  institutionId: true,
  companyId: true,
  companyName: true,
  roleTitle: true,
  location: true,
  status: true,
  lastDateToApply: true,
  domainCode: true,
  minYearsExperience: true,
  maxYearsExperience: true,
  requiredSkills: {
    select: { minProficiency: true, skill: { select: { code: true, name: true } } },
  },
  company: {
    select: {
      verificationStatus: true,
      deactivatedAt: true,
      heldAt: true,
      verifications: {
        where: { reviewedAt: { not: null } },
        orderBy: { reviewedAt: 'desc' },
        take: 1,
        select: { reviewedAt: true },
      },
    },
  },
} satisfies Prisma.JobOpeningSelect;

type JobRow = Prisma.JobOpeningGetPayload<{ select: typeof JOB_SELECT }>;

function notFound(message = 'Application not found.') {
  return new NotFoundException({ error: 'not_found', message, statusCode: 404 });
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002'
  );
}

/**
 * APP-01 — the ONLY place that creates an application or changes its status. The university's
 * shortlist and stage moves (PlacementService), the student's apply and withdraw, and later the
 * employer pipeline all go through here, so history, audit rows and notifications are never skipped.
 */
@Injectable()
export class ApplicationService {
  private readonly logger = new Logger(ApplicationService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(IdempotencyService) private readonly idempotency: IdempotencyService,
    @Inject(PublicProfileService) private readonly publicProfile: PublicProfileService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService,
    @Optional() @Inject(HiringService) hiring?: HiringService,
  ) {
    // HiringService is the only writer of stage events and the only mover of statuses (Th6-414/418).
    this.hiring = hiring ?? new HiringService(prisma, idempotency, outbox);
  }

  private readonly hiring: HiringService;

  /* ------------------------------ status changes (one place) ------------------------------ */

  /** The university's stage moves (its board keeps its own rules); the history and event come from HiringService. */
  moveStage(params: {
    applicationId: string;
    toStage: AtsStage;
    actorId: string | null;
    institutionId?: string;
    reason?: string | null;
  }) {
    return this.hiring.moveInstitutionStage({
      applicationId: params.applicationId,
      toStage: params.toStage,
      actorId: params.actorId,
      institutionId: params.institutionId,
      note: params.reason ?? null,
    });
  }

  /** The university shortlists a student (creates the application in SHORTLISTED). */
  async createShortlisted(params: {
    openingId: string;
    studentId: string;
    matchScore: number | null;
    actorId: string | null;
  }) {
    const created = await this.prisma.$transaction(async (tx) => {
      const opening = await tx.jobOpening.findUniqueOrThrow({
        where: { id: params.openingId },
        select: { companyId: true, institutionId: true },
      });
      const application = await tx.application.create({
        data: {
          openingId: params.openingId,
          studentId: params.studentId,
          stage: 'SHORTLISTED',
          matchScore: params.matchScore,
        },
      });
      await this.hiring.appendEvent(tx, {
        applicationId: application.id,
        orgId: orgIdOf(opening),
        fromStage: null,
        toStage: 'SHORTLISTED',
        actorId: params.actorId,
        actorType: params.actorId ? 'INSTITUTION' : 'SYSTEM',
        source: 'shortlist',
      });
      await tx.auditLog.create({
        data: {
          actorId: params.actorId,
          action: 'application.created',
          resourceType: 'application',
          resourceId: application.id,
          metadata: {
            openingId: params.openingId,
            source: 'shortlist',
            after: { stage: 'SHORTLISTED' },
          },
        },
      });
      return application;
    });
    await this.hiring.publishStatusChanged(created, null, 'SHORTLISTED');
    return created;
  }

  /* ---------------------------------- apply (387/388/394) ---------------------------------- */

  /** What the employer will see (Th6-388): the same serializer as the student's own profile preview. */
  async preview(studentId: string, jobId: string): Promise<ApplicationPreview> {
    const { job } = await this.loadJobForStudent(studentId, jobId, { requireOpen: true });
    const existing = await this.prisma.application.findUnique({
      where: { openingId_studentId: { openingId: job.id, studentId } },
      select: { id: true },
    });
    const { profile, fit } = await this.buildEmployerView(studentId, job);
    return {
      jobId: job.id,
      roleTitle: job.roleTitle,
      companyName: job.companyName,
      profile,
      fit: fit
        ? { band: fit.band, matchPercent: fit.matchPercent, topReason: fit.reasons[0] ?? null }
        : null,
      alreadyApplied: existing !== null,
    };
  }

  async submit(
    studentId: string,
    jobId: string,
    params: { key: string; body: ApplyToJobRequest },
  ): Promise<ApplyToJobResponse> {
    const { job, student } = await this.loadJobForStudent(studentId, jobId, { requireOpen: true });

    const existing = await this.findExisting(job.id, studentId);
    if (existing) return this.toApplyResponse(existing, job, true);

    // Snapshot data is read before the transaction; it is written inside it.
    const { profile, fit, verifiedSkills, evidenceRefs } = await this.buildEmployerView(
      studentId,
      job,
    );
    const snapshot = buildSnapshotRecord({
      profile,
      verifiedSkills,
      evidenceRefs,
      fit: fit
        ? { band: fit.band, matchPercent: fit.matchPercent, topReason: fit.reasons[0] ?? null }
        : null,
    });

    try {
      return await this.idempotency.run({
        userId: studentId,
        scope: `student.applications.apply:${job.id}`,
        key: params.key,
        request: params.body,
        execute: async (tx) => {
          const raced = await tx.application.findUnique({
            where: { openingId_studentId: { openingId: job.id, studentId } },
          });
          if (raced) return { result: this.toApplyResponse(raced, job, true) };

          const created = await tx.application.create({
            data: {
              openingId: job.id,
              studentId,
              stage: 'APPLIED',
              coverNote: params.body.coverNote?.trim() ? params.body.coverNote.trim() : null,
            },
          });
          await tx.applicationSnapshot.create({
            data: {
              applicationId: created.id,
              profileJson: snapshot.profileJson as Prisma.InputJsonValue,
              skillsJson: snapshot.skillsJson as Prisma.InputJsonValue,
              evidenceRefs: snapshot.evidenceRefs as Prisma.InputJsonValue,
              fitJson: (snapshot.fitJson ?? undefined) as Prisma.InputJsonValue | undefined,
              serializerVersion: snapshot.serializerVersion,
            },
          });
          await this.hiring.appendEvent(tx, {
            applicationId: created.id,
            orgId: orgIdOf(job),
            fromStage: null,
            toStage: 'APPLIED',
            actorId: studentId,
            actorType: 'STUDENT',
            source: 'apply',
          });
          await tx.auditLog.create({
            data: {
              actorId: studentId,
              action: 'application.submitted',
              resourceType: 'application',
              resourceId: created.id,
              metadata: {
                openingId: job.id,
                after: { stage: 'APPLIED' },
                hasCoverNote: Boolean(created.coverNote),
              },
            },
          });
          return {
            result: this.toApplyResponse(created, job, false),
            afterCommit: () => this.notifySubmitted(student, job, created.id, profile.fullName),
          };
        },
      });
    } catch (error) {
      // Two different requests raced to apply: exactly one row exists, so return it.
      if (isUniqueViolation(error)) {
        const winner = await this.findExisting(job.id, studentId);
        if (winner) return this.toApplyResponse(winner, job, true);
      }
      throw error;
    }
  }

  /* -------------------------------------- withdraw (393) -------------------------------------- */

  async withdraw(
    studentId: string,
    applicationId: string,
    params: { key: string; body: WithdrawApplicationRequest },
  ): Promise<StudentApplicationDetail> {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, studentId },
      select: { id: true, stage: true },
    });
    if (!application) throw notFound();
    // Already withdrawn: the same result again (idempotent).
    if (application.stage === 'WITHDRAWN') return this.getForStudent(studentId, applicationId);
    if (!canWithdrawFromStage(application.stage as AtsStage)) {
      throw new UnprocessableEntityException({
        error: 'cannot_withdraw',
        message: 'This application is already closed and can no longer be withdrawn.',
        statusCode: 422,
        details: [
          { path: 'status', message: 'Hired or rejected applications cannot be withdrawn.' },
        ],
      });
    }

    // The same service that moves employers' candidates handles the student's withdrawal.
    await this.hiring.transition({
      applicationId,
      toStatus: 'WITHDRAWN',
      expectedFromStatus: toApplicationStatus(application.stage as AtsStage),
      note: params.body.reason,
      actor: { type: 'STUDENT', id: studentId },
      idempotencyKey: params.key,
      source: 'student_withdraw',
    });
    await this.notifyEmployerWithdrawn(applicationId);
    return this.getForStudent(studentId, applicationId);
  }

  /* ------------------------------------- student reads (392) ------------------------------------- */

  async listForStudent(studentId: string): Promise<ListStudentApplicationsResponse> {
    const rows = await this.prisma.application.findMany({
      where: { studentId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        openingId: true,
        stage: true,
        createdAt: true,
        updatedAt: true,
        opening: { select: JOB_SELECT },
      },
    });
    return { applications: rows.map((row) => this.toCard(row, row.opening)) };
  }

  async getForStudent(studentId: string, applicationId: string): Promise<StudentApplicationDetail> {
    const row = await this.prisma.application.findFirst({
      where: { id: applicationId, studentId },
      select: {
        id: true,
        openingId: true,
        stage: true,
        coverNote: true,
        createdAt: true,
        updatedAt: true,
        opening: { select: JOB_SELECT },
        // Only the transition and its time: never the internal reason or actor.
        stageEvents: { orderBy: { createdAt: 'asc' }, select: STUDENT_TIMELINE_EVENT_SELECT },
      },
    });
    if (!row) throw notFound();

    return {
      ...this.toCard(row, row.opening),
      coverNote: row.coverNote,
      timeline: studentTimeline(row.stageEvents),
      canWithdraw: canWithdrawFromStage(row.stage as AtsStage),
    };
  }

  /* ----------------------------------------- helpers ----------------------------------------- */

  private toCard(
    row: { id: string; stage: string; createdAt: Date; updatedAt: Date; openingId: string },
    job: JobRow,
  ): StudentApplicationCard {
    const stage = row.stage as AtsStage;
    const verified = isCompanyVerified(job.company);
    return {
      id: row.id,
      referenceNumber: applicationReference(row.id),
      jobId: row.openingId,
      roleTitle: job.roleTitle,
      companyName: job.companyName,
      companyId: job.companyId,
      companyVerified: verified,
      companyVerifiedAt: verified
        ? (job.company?.verifications[0]?.reviewedAt?.toISOString() ?? null)
        : null,
      location: job.location,
      status: toApplicationStatus(stage),
      statusLabel: studentStatusLabel(stage),
      appliedAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toApplyResponse(
    row: { id: string; stage: string; createdAt: Date },
    job: Pick<JobRow, 'id' | 'roleTitle' | 'companyName'>,
    alreadyApplied: boolean,
  ): ApplyToJobResponse {
    const stage = row.stage as AtsStage;
    return {
      applicationId: row.id,
      referenceNumber: applicationReference(row.id),
      jobId: job.id,
      roleTitle: job.roleTitle,
      companyName: job.companyName,
      appliedAt: row.createdAt.toISOString(),
      status: toApplicationStatus(stage),
      statusLabel: studentStatusLabel(stage),
      alreadyApplied,
    };
  }

  private findExisting(openingId: string, studentId: string) {
    return this.prisma.application.findUnique({
      where: { openingId_studentId: { openingId, studentId } },
    });
  }

  /**
   * The job must be at the student's institution, from a visible company and allowed for them (the
   * JOB-02 rules). Anything else is a 404; a visible job that is closed or expired is a 409.
   */
  private async loadJobForStudent(
    studentId: string,
    jobId: string,
    options: { requireOpen: boolean },
  ) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, email: true, fullName: true, institutionId: true },
    });
    if (!student?.institutionId) throw notFound('Job not found.');
    const job = await this.prisma.jobOpening.findFirst({
      where: {
        id: jobId,
        institutionId: student.institutionId,
        status: { in: ['OPEN', 'CLOSED'] },
        AND: [COMPANY_VISIBLE_WHERE],
      },
      select: JOB_SELECT,
    });
    if (
      !job ||
      !isJobAllowedForStudent({ id: student.id, institutionId: student.institutionId }, job)
    ) {
      throw notFound('Job not found.');
    }
    if (options.requireOpen && !isAcceptingApplications(job)) {
      throw new ConflictException({
        error: 'job_closed',
        message: 'This job is no longer accepting applications.',
        statusCode: 409,
      });
    }
    return { student, job };
  }

  /** Employer-visible profile (Th6-222 serializer), verified skills, evidence and fit for a job. */
  private async buildEmployerView(studentId: string, job: JobRow) {
    const [profile, claims, experiences] = await Promise.all([
      this.publicProfile.getForOwner(studentId),
      this.prisma.skillClaim.findMany({
        where: { studentId, status: 'VERIFIED' },
        select: { proficiency: true, skill: { select: { code: true, name: true, domain: true } } },
      }),
      this.prisma.workExperience.findMany({
        where: { studentId, status: 'VERIFIED' },
        select: { id: true, documents: { select: { id: true } } },
      }),
    ]);
    const fit: OpeningFit | null = scoreOpeningForStudent(studentId, job, claims);
    const evidenceRefs: EvidenceRef[] = experiences.flatMap((experience) => [
      { type: 'work_experience' as const, id: experience.id },
      ...experience.documents.map((doc) => ({
        type: 'work_experience_document' as const,
        id: doc.id,
      })),
    ]);
    return {
      profile,
      fit,
      evidenceRefs,
      verifiedSkills: claims.map((claim) => ({
        code: claim.skill.code,
        name: claim.skill.name,
        proficiency: claim.proficiency,
      })),
    };
  }

  private async companyRecipients(companyId: string) {
    return this.prisma.user.findMany({
      where: { companyId, role: 'COMPANY', deactivatedAt: null, companyRole: { not: null } },
      select: { id: true, email: true, fullName: true },
    });
  }

  /** Notifications never fail an application that is already saved. */
  private async notifySubmitted(
    student: { id: string; email: string; fullName: string },
    job: JobRow,
    applicationId: string,
    candidateName: string,
  ): Promise<void> {
    try {
      await this.notifications.notifyApplicationSubmitted({
        userId: student.id,
        email: student.email,
        fullName: student.fullName,
        companyName: job.companyName,
        roleTitle: job.roleTitle,
        applicationId,
        referenceNumber: applicationReference(applicationId),
      });
      if (job.companyId) {
        for (const member of await this.companyRecipients(job.companyId)) {
          await this.notifications.notifyEmployerApplicant({
            kind: 'received',
            userId: member.id,
            email: member.email,
            recipientName: member.fullName,
            candidateName,
            roleTitle: job.roleTitle,
            applicationId,
            openingId: job.id,
          });
        }
      }
    } catch (error) {
      this.logger.error(`Applied ${applicationId} but a notification failed: ${String(error)}`);
    }
  }

  private async notifyEmployerWithdrawn(applicationId: string): Promise<void> {
    try {
      const application = await this.prisma.application.findUnique({
        where: { id: applicationId },
        select: {
          openingId: true,
          opening: { select: { roleTitle: true, companyId: true } },
          snapshot: { select: { profileJson: true } },
          student: { select: { fullName: true } },
        },
      });
      if (!application?.opening.companyId) return;
      const name =
        (application.snapshot?.profileJson as { fullName?: string } | null)?.fullName ??
        application.student.fullName;
      for (const member of await this.companyRecipients(application.opening.companyId)) {
        await this.notifications.notifyEmployerApplicant({
          kind: 'withdrawn',
          userId: member.id,
          email: member.email,
          recipientName: member.fullName,
          candidateName: name,
          roleTitle: application.opening.roleTitle,
          applicationId,
          openingId: application.openingId,
        });
      }
    } catch (error) {
      this.logger.error(`Withdrew ${applicationId} but a notification failed: ${String(error)}`);
    }
  }
}
