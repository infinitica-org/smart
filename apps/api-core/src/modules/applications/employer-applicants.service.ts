import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { z } from 'zod';
import {
  APPLICATION_STATUS_RANK,
  EMPLOYER_APPLICATION_STATUS_LABELS,
  allowedNextStatuses,
  toApplicationStatus,
  type ApplicantSortKey,
  type ApplicationStatus,
  type AtsStage,
  type EmployerApplicantCard,
  type ListEmployerApplicantsQuery,
  type ListEmployerApplicantsResponse,
} from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { requireCompanyActor } from '../company-profile/company-access.js';
import { scoreOpeningForStudent } from '../matching/opening-fit.js';
import { readSnapshotFit, readSnapshotName } from './application-snapshot.js';

/** Upper bound on applicants ordered per request (sorting needs the whole set). */
const MAX_APPLICANTS = 500;

const CursorSchema = z.object({ a: z.number(), b: z.number(), id: z.string() });
type CursorKey = z.infer<typeof CursorSchema>;

export function encodeApplicantCursor(key: CursorKey): string {
  return Buffer.from(JSON.stringify(key)).toString('base64url');
}

export function decodeApplicantCursor(raw: string): CursorKey {
  try {
    return CursorSchema.parse(JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')));
  } catch {
    throw new UnprocessableEntityException({
      error: 'validation_failed',
      message: 'Request failed validation.',
      statusCode: 422,
      details: [{ path: 'cursor', message: 'This page cursor is not valid.' }],
    });
  }
}

function compareKeys(x: CursorKey, y: CursorKey): number {
  if (x.a !== y.a) return x.a - y.a;
  if (x.b !== y.b) return x.b - y.b;
  return x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
}

/**
 * The ordering keys are a fixed whitelist (fit, applied date, status): the sort is never driven by
 * a personal or protected attribute, and never by anything the client names freely.
 */
export function sortKeyFor(
  sort: ApplicantSortKey,
  row: { fitPercent: number | null; appliedAt: number; status: ApplicationStatus; id: string },
): CursorKey {
  if (sort === 'fit') return { a: -(row.fitPercent ?? -1), b: -row.appliedAt, id: row.id };
  if (sort === 'status') {
    return { a: APPLICATION_STATUS_RANK[row.status], b: -row.appliedAt, id: row.id };
  }
  return { a: -row.appliedAt, b: 0, id: row.id };
}

const STAGES_BY_STATUS: Record<ApplicationStatus, AtsStage[]> = {
  APPLIED: ['APPLIED'],
  REVIEWING: ['SHORTLISTED', 'AI_VERIFIED'],
  INTERVIEWING: ['INTERVIEW'],
  OFFERED: ['OFFER'],
  HIRED: ['HIRED'],
  REJECTED: ['REJECTED'],
  WITHDRAWN: ['WITHDRAWN'],
};

/** Th6-390/391 — applicants for one job of the caller's own company, read from application snapshots. */
@Injectable()
export class EmployerApplicantsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(
    userId: string,
    jobId: string,
    query: ListEmployerApplicantsQuery,
  ): Promise<ListEmployerApplicantsResponse> {
    const actor = await requireCompanyActor(this.prisma, userId, 'company.applicants.view');
    const cursor = query.cursor ? decodeApplicantCursor(query.cursor) : null;

    // Another company's job is indistinguishable from a missing one.
    const job = await this.prisma.jobOpening.findFirst({
      where: { id: jobId, companyId: actor.companyId },
      select: {
        id: true,
        roleTitle: true,
        domainCode: true,
        minYearsExperience: true,
        maxYearsExperience: true,
        location: true,
        requiredSkills: { select: { minProficiency: true, skill: { select: { code: true } } } },
      },
    });
    if (!job) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Job not found.',
        statusCode: 404,
      });
    }

    const rows = await this.prisma.application.findMany({
      where: {
        openingId: job.id,
        // Only applications the student submitted have a snapshot to read from.
        snapshot: { isNot: null },
        ...(query.status ? { stage: { in: STAGES_BY_STATUS[query.status] } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_APPLICANTS,
      select: {
        id: true,
        studentId: true,
        stage: true,
        createdAt: true,
        snapshot: { select: { profileJson: true, fitJson: true } },
      },
    });

    // Today's fit, only to show a "recalculated" hint. It never changes the order.
    const claims = await this.prisma.skillClaim.findMany({
      where: { studentId: { in: rows.map((row) => row.studentId) }, status: 'VERIFIED' },
      select: {
        studentId: true,
        proficiency: true,
        skill: { select: { code: true, domain: true } },
      },
    });
    const claimsByStudent = new Map<string, typeof claims>();
    for (const claim of claims) {
      claimsByStudent.set(claim.studentId, [
        ...(claimsByStudent.get(claim.studentId) ?? []),
        claim,
      ]);
    }

    const items = rows.map((row) => {
      const status = toApplicationStatus(row.stage as AtsStage);
      const fit = readSnapshotFit(row.snapshot?.fitJson);
      const current = scoreOpeningForStudent(
        row.studentId,
        job,
        claimsByStudent.get(row.studentId) ?? [],
      );
      const card: EmployerApplicantCard = {
        applicationId: row.id,
        candidateName: readSnapshotName(row.snapshot?.profileJson),
        fit,
        fitRecalculated:
          (current?.band ?? null) !== (fit?.band ?? null) ||
          (current?.matchPercent ?? null) !== (fit?.matchPercent ?? null),
        status,
        statusLabel: EMPLOYER_APPLICATION_STATUS_LABELS[status],
        allowedNext: allowedNextStatuses(status, 'EMPLOYER'),
        appliedAt: row.createdAt.toISOString(),
      };
      return {
        card,
        key: sortKeyFor(query.sort, {
          fitPercent: fit?.matchPercent ?? null,
          appliedAt: row.createdAt.getTime(),
          status,
          id: row.id,
        }),
      };
    });
    items.sort((x, y) => compareKeys(x.key, y.key));

    const start = cursor ? items.findIndex((item) => compareKeys(item.key, cursor) > 0) : 0;
    const page = start === -1 ? [] : items.slice(start, start + query.limit);
    const last = page.at(-1);
    const hasMore = start !== -1 && start + query.limit < items.length;
    return {
      job: { id: job.id, roleTitle: job.roleTitle },
      applicants: page.map((item) => item.card),
      nextCursor: hasMore && last ? encodeApplicantCursor(last.key) : null,
      total: items.length,
    };
  }
}
