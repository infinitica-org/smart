import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  REPORT_ESCALATION_THRESHOLD,
  type CreateReportRequest,
  type Report,
} from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { IdempotencyService } from '../company-profile/idempotency.service.js';
import { companyVisibleWhere, isJobAllowedForStudent } from './job-eligibility.js';

interface ReportRow {
  id: string;
  targetType: 'JOB' | 'MESSAGE';
  targetId: string;
  reason: CreateReportRequest['reason'];
  status: Report['status'];
  createdAt: Date;
}

function toReport(row: ReportRow, alreadyReported: boolean): Report {
  return {
    id: row.id,
    targetType: row.targetType,
    targetId: row.targetId,
    reason: row.reason,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    alreadyReported,
  };
}

/** Th6-386 — report a suspicious or inappropriate job. */
@Injectable()
export class JobReportsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(IdempotencyService) private readonly idempotency: IdempotencyService,
  ) {}

  async create(
    studentId: string,
    params: { key: string; body: CreateReportRequest },
  ): Promise<Report> {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, institutionId: true },
    });
    const job = student?.institutionId
      ? await this.prisma.jobOpening.findFirst({
          where: {
            id: params.body.targetId,
            institutionId: student.institutionId,
            status: { in: ['OPEN', 'CLOSED'] },
            AND: [companyVisibleWhere(student.institutionId)],
          },
          select: { id: true, institutionId: true, companyId: true },
        })
      : null;
    if (
      !student?.institutionId ||
      !job ||
      !isJobAllowedForStudent({ id: student.id, institutionId: student.institutionId }, job)
    ) {
      // A job the student cannot see is indistinguishable from one that does not exist.
      throw new NotFoundException({
        error: 'not_found',
        message: 'Job not found.',
        statusCode: 404,
      });
    }

    return this.idempotency.run({
      userId: studentId,
      scope: 'student.reports.create',
      key: params.key,
      request: params.body,
      execute: async (tx) => {
        const existing = await tx.report.findUnique({
          where: {
            reporterId_targetType_targetId: {
              reporterId: studentId,
              targetType: 'JOB',
              targetId: job.id,
            },
          },
        });
        // One report per student per job: a repeat returns the one already on file.
        if (existing) return { result: toReport(existing, true) };

        const created = await tx.report.create({
          data: {
            reporterId: studentId,
            targetType: 'JOB',
            targetId: job.id,
            reason: params.body.reason,
            details: params.body.details ?? null,
          },
        });
        // The reporter never sees this job again.
        await tx.hiddenJob.upsert({
          where: { studentId_jobId: { studentId, jobId: job.id } },
          create: { studentId, jobId: job.id, reason: `REPORTED:${params.body.reason}` },
          update: {},
        });
        await tx.auditLog.create({
          data: {
            actorId: studentId,
            action: 'job.reported',
            resourceType: 'job_opening',
            resourceId: job.id,
            reasonCode: params.body.reason,
            metadata: { reportId: created.id, hiddenForReporter: true } as Prisma.InputJsonValue,
          },
        });

        const openReports = await tx.report.count({
          where: { targetType: 'JOB', targetId: job.id, status: 'OPEN' },
        });
        // Fire once, on the report that reaches the threshold.
        if (openReports === REPORT_ESCALATION_THRESHOLD) {
          // TODO(Th6-466–473): enqueue this job in the moderation/verification queue when it exists.
          await tx.auditLog.create({
            data: {
              actorId: null,
              action: 'job.report_threshold_reached',
              resourceType: 'job_opening',
              resourceId: job.id,
              metadata: { openReports, threshold: REPORT_ESCALATION_THRESHOLD },
            },
          });
        }
        return { result: toReport(created, false) };
      },
    });
  }
}
