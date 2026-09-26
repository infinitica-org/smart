import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import { z } from 'zod';
import type {
  HideJobRequest,
  JobFlagResponse,
  JobRequirementRow,
  ListSavedJobsResponse,
  ListStudentJobsQuery,
  ListStudentJobsResponse,
  StudentJobCard,
  StudentJobDetail,
} from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { StorageService } from '../../platform/storage/storage.service.js';
import { scoreOpeningForStudent, type OpeningFit } from '../matching/opening-fit.js';
import {
  buildOpeningReadiness,
  ReadinessService,
  type ClaimInput,
  type EvidenceInput,
} from '../readiness/readiness.service.js';
import {
  companyVisibleWhere,
  acceptingOpeningWhere,
  isAcceptingApplications,
  isCompanyVerified,
  isJobAllowedForStudent,
  passesStudentEligibility,
} from './job-eligibility.js';

/** Upper bound on openings scored per request; fit sorting needs the whole eligible set. */
const MAX_SCORED_OPENINGS = 500;
const DETAIL_REASON_LIMIT = 5;

const OPENING_SELECT = {
  id: true,
  institutionId: true,
  companyId: true,
  companyName: true,
  roleTitle: true,
  location: true,
  employmentType: true,
  workMode: true,
  status: true,
  lastDateToApply: true,
  createdAt: true,
  domainCode: true,
  minYearsExperience: true,
  maxYearsExperience: true,
  minSscPercentage: true,
  minHscPercentage: true,
  backlogsAllowed: true,
  roleDetails: true,
  aboutCompany: true,
  companyOffers: true,
  salaryDetails: true,
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
      profile: { select: { logoFileId: true } },
    },
  },
} satisfies Prisma.JobOpeningSelect;

type OpeningRow = Prisma.JobOpeningGetPayload<{ select: typeof OPENING_SELECT }>;

interface StudentFacts {
  id: string;
  institutionId: string;
  sscPercentage: unknown;
  hscPercentage: unknown;
  hasActiveBacklog: boolean | null;
}

const CursorSchema = z.object({ p: z.number().int(), t: z.number().int(), id: z.string() });
type CursorKey = z.infer<typeof CursorSchema>;

export function encodeCursor(key: CursorKey): string {
  return Buffer.from(JSON.stringify(key)).toString('base64url');
}

export function decodeCursor(raw: string): CursorKey {
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

/** Sort order: best fit first, then newest, then id for a total, stable order. */
function compareKeys(a: CursorKey, b: CursorKey): number {
  if (a.p !== b.p) return b.p - a.p;
  if (a.t !== b.t) return b.t - a.t;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function notFound() {
  return new NotFoundException({ error: 'not_found', message: 'Job not found.', statusCode: 404 });
}

@Injectable()
export class StudentJobsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ReadinessService) private readonly readiness: ReadinessService,
    @Optional() @Inject(StorageService) private readonly storage?: StorageService,
  ) {}

  /* --------------------------------- Th6-379/380/381 --------------------------------- */

  async list(studentId: string, query: ListStudentJobsQuery): Promise<ListStudentJobsResponse> {
    const student = await this.loadStudent(studentId);
    if (!student) return { jobs: [], nextCursor: null, counts: { strong: 0, good: 0, all: 0 } };
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;

    const rows = await this.prisma.jobOpening.findMany({
      where: {
        AND: [
          acceptingOpeningWhere(student.institutionId),
          { hiddenBy: { none: { studentId } } },
          ...(query.type ? [{ employmentType: query.type }] : []),
          // Jobs with no work mode are left out only when a work-mode filter is applied.
          ...(query.mode ? [{ workMode: query.mode }] : []),
          ...(query.location
            ? [{ location: { contains: query.location, mode: 'insensitive' as const } }]
            : []),
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: MAX_SCORED_OPENINGS,
      select: OPENING_SELECT,
    });
    const eligible = rows.filter(
      (row) => passesStudentEligibility(row, student) && isJobAllowedForStudent(student, row),
    );

    const { fits, applied, saved } = await this.loadStudentContext(student.id, eligible);
    const cards = eligible.map((row) =>
      this.toCard(row, fits.get(row.id) ?? null, applied.has(row.id), saved.has(row.id)),
    );
    const keyed = cards
      .map((card) => ({ card, key: this.keyOf(card) }))
      .sort((a, b) => compareKeys(a.key, b.key));

    const counts = {
      strong: keyed.filter((k) => k.card.fit?.band === 'STRONG').length,
      good: keyed.filter((k) => k.card.fit?.band === 'MODERATE').length,
      all: keyed.length,
    };
    const inTab = keyed.filter(({ card }) =>
      query.fit === 'STRONG'
        ? card.fit?.band === 'STRONG'
        : query.fit === 'GOOD'
          ? card.fit?.band === 'MODERATE'
          : true,
    );

    const start = cursor ? inTab.findIndex((item) => compareKeys(item.key, cursor) > 0) : 0;
    const page = start === -1 ? [] : inTab.slice(start, start + query.limit);
    const last = page[page.length - 1];
    const hasMore = start !== -1 && start + query.limit < inTab.length;
    return {
      jobs: page.map((item) => item.card),
      nextCursor: hasMore && last ? encodeCursor(last.key) : null,
      counts,
    };
  }

  /* ------------------------------------- Th6-382/383 ------------------------------------- */

  async detail(studentId: string, jobId: string): Promise<StudentJobDetail> {
    const student = await this.loadStudent(studentId);
    if (!student) throw notFound();
    const row = await this.loadAccessibleJob(student, jobId);

    const [applicationRow, savedRow, hiddenRow] = await Promise.all([
      this.prisma.application.findFirst({
        where: { studentId, openingId: row.id },
        select: { id: true },
      }),
      this.prisma.savedJob.findUnique({
        where: { studentId_jobId: { studentId, jobId: row.id } },
        select: { jobId: true },
      }),
      this.prisma.hiddenJob.findUnique({
        where: { studentId_jobId: { studentId, jobId: row.id } },
        select: { jobId: true },
      }),
    ]);

    const accepting = isAcceptingApplications(row);
    // A job that is no longer open is only visible to a student who applied to it or saved it.
    if (!accepting && !applicationRow && !savedRow) throw notFound();

    const [claims, evidence, summary] = await Promise.all([
      this.prisma.skillClaim.findMany({
        where: { studentId },
        select: {
          status: true,
          proficiency: true,
          skill: { select: { code: true, name: true, domain: true } },
        },
      }),
      this.prisma.evidenceRecord.findMany({
        where: { studentId },
        select: {
          evidenceType: true,
          relatedSkillCodes: true,
          verificationStatus: true,
          sourceEntityId: true,
        },
      }),
      this.readiness.getSummary(studentId),
    ]);

    const verified = claims.filter((claim) => claim.status === 'VERIFIED');
    const fit = scoreOpeningForStudent(student.id, row, verified);
    const readiness = buildOpeningReadiness(
      {
        id: row.id,
        roleTitle: row.roleTitle,
        companyName: row.companyName,
        location: row.location,
        requiredSkills: row.requiredSkills,
      },
      claims as ClaimInput[],
      evidence as EvidenceInput[],
    );

    const requirements: JobRequirementRow[] = readiness.skills.map((skill) => {
      const status =
        skill.status === 'MEETS_MINIMUM'
          ? skill.evidenceMet >= skill.evidenceRequired
            ? 'MET'
            : 'PARTIAL'
          : skill.status === 'BELOW_MINIMUM'
            ? 'PARTIAL'
            : 'MISSING';
      // Th6-337: send the student to that skill's own recommendation; fall back to the Skills page.
      const recommendation = summary.recommendations.find(
        (rec) => rec.skillCode === skill.skillCode && !rec.optional,
      );
      return {
        skillCode: skill.skillCode,
        skillName: skill.skillName,
        requiredProficiency: skill.minProficiency as JobRequirementRow['requiredProficiency'],
        importance: 'MANDATORY' as const,
        studentProficiency: skill.studentProficiency,
        status,
        evidenceRequired: skill.evidenceRequired,
        evidenceMet: skill.evidenceMet,
        action:
          status === 'MET'
            ? null
            : recommendation
              ? { label: recommendation.title, href: recommendation.href }
              : { label: 'Add or verify this skill', href: '/skills' },
      };
    });

    const card = this.toCard(row, fit, applicationRow !== null, savedRow !== null);
    return {
      ...card,
      description: row.roleDetails,
      aboutCompany: row.aboutCompany,
      companyOffers: row.companyOffers,
      salaryDetails: row.salaryDetails,
      logoUrl: await this.logoUrl(row.company?.profile?.logoFileId ?? null),
      acceptingApplications: accepting,
      applicationId: applicationRow?.id ?? null,
      hidden: hiddenRow !== null,
      whyItMatches: (fit?.reasons ?? []).slice(0, DETAIL_REASON_LIMIT),
      requirements,
    };
  }

  /* ------------------------------------- Th6-384 saved ------------------------------------- */

  async listSaved(studentId: string): Promise<ListSavedJobsResponse> {
    const student = await this.loadStudent(studentId);
    if (!student) return { jobs: [] };
    const saved = await this.prisma.savedJob.findMany({
      where: {
        studentId,
        job: {
          institutionId: student.institutionId,
          AND: [companyVisibleWhere(student.institutionId)],
        },
      },
      orderBy: { savedAt: 'desc' },
      select: { job: { select: OPENING_SELECT } },
    });
    const rows = saved
      .map((entry) => entry.job)
      .filter((row) => row.status !== 'DRAFT' && isJobAllowedForStudent(student, row));
    const { fits, applied } = await this.loadStudentContext(student.id, rows);
    return {
      jobs: rows.map((row) =>
        this.toCard(row, fits.get(row.id) ?? null, applied.has(row.id), true),
      ),
    };
  }

  async save(studentId: string, jobId: string): Promise<JobFlagResponse> {
    const student = await this.loadStudent(studentId);
    if (!student) throw notFound();
    const job = await this.loadAccessibleJob(student, jobId);
    await this.prisma.savedJob.upsert({
      where: { studentId_jobId: { studentId, jobId: job.id } },
      create: { studentId, jobId: job.id },
      update: {},
    });
    return { jobId: job.id, active: true };
  }

  async unsave(studentId: string, jobId: string): Promise<JobFlagResponse> {
    // Idempotent: removing something that is not saved is a success, and never reveals other jobs.
    await this.prisma.savedJob.deleteMany({ where: { studentId, jobId } });
    return { jobId, active: false };
  }

  /* ------------------------------------- Th6-385 hidden ------------------------------------- */

  async hide(studentId: string, jobId: string, body: HideJobRequest): Promise<JobFlagResponse> {
    const student = await this.loadStudent(studentId);
    if (!student) throw notFound();
    const job = await this.loadAccessibleJob(student, jobId);
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.hiddenJob.findUnique({
        where: { studentId_jobId: { studentId, jobId: job.id } },
      });
      const reason = body.reason ?? null;
      if (existing && existing.reason === reason) return; // an identical repeat changes nothing
      await tx.hiddenJob.upsert({
        where: { studentId_jobId: { studentId, jobId: job.id } },
        create: { studentId, jobId: job.id, reason },
        update: { reason },
      });
      await tx.auditLog.create({
        data: {
          actorId: studentId,
          action: 'job.hidden',
          resourceType: 'job_opening',
          resourceId: job.id,
          metadata: { reason, before: { hidden: existing !== null }, after: { hidden: true } },
        },
      });
    });
    // TODO(Th6-377): send `body.reason` to the matching feedback endpoint once it exists.
    return { jobId: job.id, active: true };
  }

  async unhide(studentId: string, jobId: string): Promise<JobFlagResponse> {
    await this.prisma.$transaction(async (tx) => {
      const removed = await tx.hiddenJob.deleteMany({ where: { studentId, jobId } });
      if (removed.count > 0) {
        await tx.auditLog.create({
          data: {
            actorId: studentId,
            action: 'job.unhidden',
            resourceType: 'job_opening',
            resourceId: jobId,
            metadata: { before: { hidden: true }, after: { hidden: false } },
          },
        });
      }
    });
    return { jobId, active: false };
  }

  /* ----------------------------------------- helpers ----------------------------------------- */

  private async loadStudent(studentId: string): Promise<StudentFacts | null> {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        institutionId: true,
        sscPercentage: true,
        hscPercentage: true,
        hasActiveBacklog: true,
      },
    });
    if (!student?.institutionId) return null;
    return { ...student, institutionId: student.institutionId };
  }

  /** A job the student may see: their institution, a visible company, not a draft; else a plain 404. */
  private async loadAccessibleJob(student: StudentFacts, jobId: string): Promise<OpeningRow> {
    const uuid = z.uuid().safeParse(jobId);
    if (!uuid.success) throw notFound();
    const row = await this.prisma.jobOpening.findFirst({
      where: {
        id: uuid.data,
        institutionId: student.institutionId,
        status: { in: ['OPEN', 'CLOSED'] },
        AND: [companyVisibleWhere(student.institutionId)],
      },
      select: OPENING_SELECT,
    });
    if (!row || !isJobAllowedForStudent(student, row)) throw notFound();
    return row;
  }

  private async loadStudentContext(studentId: string, rows: readonly OpeningRow[]) {
    const ids = rows.map((row) => row.id);
    const [claims, applications, saved] = await Promise.all([
      this.prisma.skillClaim.findMany({
        where: { studentId, status: 'VERIFIED' },
        select: { proficiency: true, skill: { select: { code: true, domain: true } } },
      }),
      this.prisma.application.findMany({
        where: { studentId, openingId: { in: ids } },
        select: { openingId: true },
      }),
      this.prisma.savedJob.findMany({
        where: { studentId, jobId: { in: ids } },
        select: { jobId: true },
      }),
    ]);
    const fits = new Map<string, OpeningFit | null>(
      rows.map((row) => [row.id, scoreOpeningForStudent(studentId, row, claims)]),
    );
    return {
      fits,
      applied: new Set(applications.map((a) => a.openingId)),
      saved: new Set(saved.map((s) => s.jobId)),
    };
  }

  private toCard(
    row: OpeningRow,
    fit: OpeningFit | null,
    applied: boolean,
    saved: boolean,
  ): StudentJobCard {
    const verified = isCompanyVerified(row.company);
    return {
      id: row.id,
      roleTitle: row.roleTitle,
      companyName: row.companyName,
      companyId: row.companyId,
      companyVerified: verified,
      companyVerifiedAt: verified
        ? (row.company?.verifications[0]?.reviewedAt?.toISOString() ?? null)
        : null,
      location: row.location,
      employmentType: row.employmentType,
      workMode: row.workMode,
      lastDateToApply: row.lastDateToApply ? row.lastDateToApply.toISOString().slice(0, 10) : null,
      postedAt: row.createdAt.toISOString(),
      fit: fit
        ? { band: fit.band, matchPercent: fit.matchPercent, topReason: fit.reasons[0] ?? null }
        : null,
      applied,
      saved,
    };
  }

  private keyOf(card: StudentJobCard): CursorKey {
    return {
      p: card.fit?.matchPercent ?? -1,
      t: new Date(card.postedAt).getTime(),
      id: card.id,
    };
  }

  private async logoUrl(fileId: string | null): Promise<string | null> {
    if (!fileId || !this.storage) return null;
    try {
      return await this.storage.getSignedDownloadUrl(fileId);
    } catch {
      return null;
    }
  }
}
