import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type {
  CampusAccessRequestDto,
  CampusAccessRequestStatus,
  CreateCampusAccessRequest,
  DecideCampusAccessRequest,
  DecideCampusAccessResponse,
  EmployerCampusAccessResponse,
  RevokeCampusAccess,
  UniversityEmployerRequestRow,
  UniversityEmployerRequestsQuery,
  UniversityEmployerRequestsResponse,
  UniversityEmployerRow,
  UniversityEmployersQuery,
  UniversityEmployersResponse,
} from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { requireCompanyActor } from '../company-profile/company-access.js';
import { IdempotencyService } from '../company-profile/idempotency.service.js';
import { isCompanyVerified } from '../student-jobs/job-eligibility.js';
import {
  createNotices,
  forbidden,
  isUniqueViolation,
  notFound,
  staffScope,
  unprocessable,
  writeAudit,
  type Db,
} from './campus-shared.js';

const REQUEST_INCLUDE = {
  company: {
    select: {
      name: true,
      verificationStatus: true,
      deactivatedAt: true,
      heldAt: true,
      taxonomyDomain: true,
      profile: { select: { logoFileId: true, industry: true } },
      _count: { select: { jobOpenings: { where: { status: 'OPEN' as const } } } },
    },
  },
} satisfies Prisma.CampusAccessRequestInclude;

type RequestWithCompany = Prisma.CampusAccessRequestGetPayload<{ include: typeof REQUEST_INCLUDE }>;

export function toRequestRow(row: RequestWithCompany): UniversityEmployerRequestRow {
  return {
    id: row.id,
    companyId: row.companyId,
    companyName: row.company.name,
    logoFileId: row.company.profile?.logoFileId ?? null,
    verified: isCompanyVerified(row.company),
    industry: row.company.profile?.industry ?? row.company.taxonomyDomain ?? null,
    openJobCount: row.company._count.jobOpenings,
    message: row.message,
    status: row.status,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
    decidedAt: row.decidedAt?.toISOString() ?? null,
  };
}

/**
 * Th6-445 / 446 / 447 — employer campus access. `UniversityEmployerAccess` is the single source of truth
 * for "approved at this campus"; requests are the review trail.
 */
@Injectable()
export class CampusAccessService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(IdempotencyService) private readonly idempotency: IdempotencyService,
  ) {}

  /* ------------------------------------ employer side ------------------------------------ */

  /** Th6-445: every partner university with this employer's current standing there. */
  async listForEmployer(userId: string): Promise<EmployerCampusAccessResponse> {
    const actor = await requireCompanyActor(this.prisma, userId, 'company.team.view');
    const [company, institutions, requests, access] = await Promise.all([
      this.prisma.company.findUnique({
        where: { id: actor.companyId },
        select: { verificationStatus: true, deactivatedAt: true, heldAt: true },
      }),
      this.prisma.institution.findMany({
        where: { verificationStatus: 'APPROVED', deactivatedAt: null, heldAt: null },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
      this.prisma.campusAccessRequest.findMany({
        where: { companyId: actor.companyId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.universityEmployerAccess.findMany({ where: { companyId: actor.companyId } }),
    ]);

    return {
      canRequest: isCompanyVerified(company),
      universities: institutions.map((institution) => {
        const latest = requests.find((request) => request.institutionId === institution.id);
        const grant = access.find((entry) => entry.institutionId === institution.id);
        let status: CampusAccessRequestStatus | 'NONE' = latest?.status ?? 'NONE';
        if (grant?.status === 'ACTIVE') status = 'APPROVED';
        else if (grant?.status === 'REVOKED' && status !== 'PENDING') status = 'REVOKED';
        return {
          institutionId: institution.id,
          institutionName: institution.name,
          status,
          reason: status === 'NONE' || status === 'PENDING' ? null : (latest?.reason ?? null),
          requestId: latest?.id ?? null,
          updatedAt: (latest?.decidedAt ?? latest?.createdAt)?.toISOString() ?? null,
        };
      }),
    };
  }

  /** Th6-445: only a VERIFIED employer may ask; a second PENDING request for the same campus is a 422. */
  async requestAccess(
    userId: string,
    key: string,
    body: CreateCampusAccessRequest,
  ): Promise<CampusAccessRequestDto> {
    // TODO(Th6-344/346, Vishal V): swap for the shared company-verification check once it is exposed.
    const actor = await requireCompanyActor(this.prisma, userId, 'company.profile.edit');
    const company = await this.prisma.company.findUnique({
      where: { id: actor.companyId },
      select: { verificationStatus: true, deactivatedAt: true, heldAt: true },
    });
    if (!isCompanyVerified(company)) {
      throw forbidden('Only verified employers can request campus access.');
    }
    const institution = await this.prisma.institution.findFirst({
      where: {
        id: body.institutionId,
        verificationStatus: 'APPROVED',
        deactivatedAt: null,
        heldAt: null,
      },
      select: { id: true },
    });
    if (!institution) throw notFound('University not found.');

    try {
      return await this.idempotency.run<CampusAccessRequestDto>({
        userId,
        scope: 'employer.campus_access.request',
        key,
        request: body,
        execute: async (tx) => {
          const [pending, active] = await Promise.all([
            tx.campusAccessRequest.findFirst({
              where: {
                companyId: actor.companyId,
                institutionId: body.institutionId,
                status: 'PENDING',
              },
              select: { id: true },
            }),
            tx.universityEmployerAccess.findFirst({
              where: {
                companyId: actor.companyId,
                institutionId: body.institutionId,
                status: 'ACTIVE',
              },
              select: { id: true },
            }),
          ]);
          if (pending) {
            throw unprocessable(
              'duplicate_pending',
              'You already have a pending request for this university.',
            );
          }
          if (active) {
            throw unprocessable(
              'already_approved',
              'You already have campus access at this university.',
            );
          }
          const created = await tx.campusAccessRequest.create({
            data: {
              companyId: actor.companyId,
              institutionId: body.institutionId,
              message: body.message || null,
              requestedById: userId,
            },
          });
          await writeAudit(tx, {
            actorId: userId,
            action: 'campus_access.requested',
            resourceType: 'campus_access_request',
            resourceId: created.id,
            orgId: actor.companyId,
            before: null,
            after: { status: 'PENDING', institutionId: body.institutionId },
          });
          return {
            result: {
              id: created.id,
              institutionId: created.institutionId,
              status: created.status,
              message: created.message,
              reason: null,
              createdAt: created.createdAt.toISOString(),
              decidedAt: null,
            },
          };
        },
      });
    } catch (error) {
      // Two requests raced past the check with different keys: the partial unique index caught it.
      if (isUniqueViolation(error)) {
        throw unprocessable(
          'duplicate_pending',
          'You already have a pending request for this university.',
        );
      }
      throw error;
    }
  }

  /* ---------------------------------- university side ---------------------------------- */

  /** Th6-445: the review queue, always scoped to the caller's own institution. */
  async listRequests(
    user: RequestUser,
    query: UniversityEmployerRequestsQuery,
  ): Promise<UniversityEmployerRequestsResponse> {
    const scope = staffScope(user);
    const rows = await this.prisma.campusAccessRequest.findMany({
      where: {
        institutionId: scope.institutionId,
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: REQUEST_INCLUDE,
    });
    const page = rows.slice(0, query.limit);
    return {
      requests: page.map(toRequestRow),
      nextCursor: rows.length > query.limit ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  /**
   * Th6-446: approve or deny. Deciding again with the same decision returns the same result and does
   * nothing more; a conflicting decision on a decided request is a 409. Another university's request is a 404.
   */
  async decide(
    user: RequestUser,
    requestId: string,
    body: DecideCampusAccessRequest,
  ): Promise<DecideCampusAccessResponse> {
    const scope = staffScope(user, ['INSTITUTION_ADMIN']);
    const target: CampusAccessRequestStatus = body.decision === 'APPROVE' ? 'APPROVED' : 'DENIED';

    const outcome = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.campusAccessRequest.findFirst({
        where: { id: requestId, institutionId: scope.institutionId },
        include: REQUEST_INCLUDE,
      });
      if (!existing) throw notFound('Request not found.');
      if (existing.status === target) return existing;
      if (existing.status !== 'PENDING') {
        throw new ConflictException({
          error: 'already_decided',
          message: `This request was already ${existing.status.toLowerCase()}.`,
          statusCode: 409,
        });
      }

      const now = new Date();
      // The status guard makes the transition atomic: of two concurrent deciders only one updates a row.
      const moved = await tx.campusAccessRequest.updateMany({
        where: { id: requestId, institutionId: scope.institutionId, status: 'PENDING' },
        data: {
          status: target,
          decidedById: scope.userId,
          decidedAt: now,
          reason: body.reason?.trim() || null,
        },
      });
      const decided = await tx.campusAccessRequest.findFirstOrThrow({
        where: { id: requestId },
        include: REQUEST_INCLUDE,
      });
      if (moved.count === 0) {
        if (decided.status === target) return decided;
        throw new ConflictException({
          error: 'already_decided',
          message: `This request was already ${decided.status.toLowerCase()}.`,
          statusCode: 409,
        });
      }

      if (target === 'APPROVED') {
        await tx.universityEmployerAccess.upsert({
          where: {
            institutionId_companyId: {
              institutionId: scope.institutionId,
              companyId: existing.companyId,
            },
          },
          create: {
            institutionId: scope.institutionId,
            companyId: existing.companyId,
            status: 'ACTIVE',
            approvedAt: now,
          },
          update: { status: 'ACTIVE', approvedAt: now, revokedAt: null, revokedById: null },
        });
      }
      await writeAudit(tx, {
        actorId: scope.userId,
        action: target === 'APPROVED' ? 'campus_access.approved' : 'campus_access.denied',
        resourceType: 'campus_access_request',
        resourceId: requestId,
        orgId: scope.institutionId,
        reason: body.reason,
        before: { status: 'PENDING' },
        after: { status: target, companyId: existing.companyId },
      });
      await this.notifyEmployer(tx, existing.companyId, existing.requestedById, {
        dedupePrefix: `campus:request:${requestId}:${target}`,
        title: target === 'APPROVED' ? 'Campus access approved' : 'Campus access request declined',
        body:
          target === 'APPROVED'
            ? 'A university approved your campus access. Your jobs are now visible to its students.'
            : `A university declined your campus access request${body.reason ? `: ${body.reason.trim()}` : '.'}`,
        metadata: { institutionId: scope.institutionId, requestId },
      });
      return decided;
    });
    return { request: toRequestRow(outcome) };
  }

  /** Th6-446: revoke. Jobs disappear for this university's students; applications are never deleted. */
  async revoke(
    user: RequestUser,
    companyId: string,
    body: RevokeCampusAccess,
  ): Promise<{ companyId: string; status: 'REVOKED'; revokedAt: string }> {
    const scope = staffScope(user, ['INSTITUTION_ADMIN']);
    return this.prisma.$transaction(async (tx) => {
      const access = await tx.universityEmployerAccess.findUnique({
        where: { institutionId_companyId: { institutionId: scope.institutionId, companyId } },
      });
      if (!access) throw notFound('Employer not found.');
      if (access.status === 'REVOKED') {
        return {
          companyId,
          status: 'REVOKED' as const,
          revokedAt: (access.revokedAt ?? new Date()).toISOString(),
        };
      }
      const now = new Date();
      const moved = await tx.universityEmployerAccess.updateMany({
        where: { id: access.id, status: 'ACTIVE' },
        data: { status: 'REVOKED', revokedAt: now, revokedById: scope.userId },
      });
      if (moved.count === 0) {
        return { companyId, status: 'REVOKED' as const, revokedAt: now.toISOString() };
      }
      const latestApproved = await tx.campusAccessRequest.findFirst({
        where: { institutionId: scope.institutionId, companyId, status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, requestedById: true },
      });
      if (latestApproved) {
        await tx.campusAccessRequest.update({
          where: { id: latestApproved.id },
          data: {
            status: 'REVOKED',
            reason: body.reason,
            decidedById: scope.userId,
            decidedAt: now,
          },
        });
      }
      await writeAudit(tx, {
        actorId: scope.userId,
        action: 'campus_access.revoked',
        resourceType: 'university_employer_access',
        resourceId: access.id,
        orgId: scope.institutionId,
        reason: body.reason,
        before: { status: 'ACTIVE' },
        after: { status: 'REVOKED', companyId },
      });
      await this.notifyEmployer(tx, companyId, latestApproved?.requestedById ?? null, {
        dedupePrefix: `campus:access:${access.id}:revoked:${now.getTime()}`,
        title: 'Campus access revoked',
        body: `A university revoked your campus access: ${body.reason}`,
        metadata: { institutionId: scope.institutionId },
      });
      return { companyId, status: 'REVOKED' as const, revokedAt: now.toISOString() };
    });
  }

  /** Th6-447: approved and revoked employers with aggregates only. No student is named. */
  async listEmployers(
    user: RequestUser,
    query: UniversityEmployersQuery,
  ): Promise<UniversityEmployersResponse> {
    const scope = staffScope(user);
    const rows = await this.prisma.universityEmployerAccess.findMany({
      where: {
        institutionId: scope.institutionId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.search
          ? { company: { name: { contains: query.search, mode: 'insensitive' as const } } }
          : {}),
      },
      orderBy: [{ approvedAt: 'desc' }, { id: 'asc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: {
        company: {
          select: {
            name: true,
            taxonomyDomain: true,
            profile: { select: { logoFileId: true, industry: true } },
          },
        },
      },
    });
    const page = rows.slice(0, query.limit);
    const companyIds = page.map((row) => row.companyId);

    const jobs =
      companyIds.length === 0
        ? []
        : await this.prisma.jobOpening.findMany({
            where: { institutionId: scope.institutionId, companyId: { in: companyIds } },
            select: { id: true, companyId: true, status: true, createdAt: true },
          });
    const jobCompany = new Map(jobs.map((job) => [job.id, job.companyId]));
    const [applicants, hires] =
      jobs.length === 0
        ? [[], []]
        : await Promise.all([
            this.prisma.application.groupBy({
              by: ['openingId'],
              where: { openingId: { in: jobs.map((job) => job.id) } },
              _count: { _all: true },
              _max: { updatedAt: true },
            }),
            this.prisma.application.groupBy({
              by: ['openingId'],
              where: { openingId: { in: jobs.map((job) => job.id) }, stage: 'HIRED' },
              _count: { _all: true },
            }),
          ]);

    const stats = new Map<
      string,
      { open: number; applicants: number; hires: number; last: Date | null }
    >();
    const statFor = (companyId: string) => {
      let entry = stats.get(companyId);
      if (!entry) {
        entry = { open: 0, applicants: 0, hires: 0, last: null };
        stats.set(companyId, entry);
      }
      return entry;
    };
    const bump = (entry: { last: Date | null }, at: Date | null | undefined) => {
      if (at && (!entry.last || at > entry.last)) entry.last = at;
    };
    for (const job of jobs) {
      if (!job.companyId) continue;
      const entry = statFor(job.companyId);
      if (job.status === 'OPEN') entry.open += 1;
      bump(entry, job.createdAt);
    }
    for (const group of applicants) {
      const companyId = jobCompany.get(group.openingId);
      if (!companyId) continue;
      const entry = statFor(companyId);
      entry.applicants += group._count._all;
      bump(entry, group._max.updatedAt);
    }
    for (const group of hires) {
      const companyId = jobCompany.get(group.openingId);
      if (companyId) statFor(companyId).hires += group._count._all;
    }

    return {
      employers: page.map((row): UniversityEmployerRow => {
        const entry = stats.get(row.companyId);
        return {
          companyId: row.companyId,
          companyName: row.company.name,
          logoFileId: row.company.profile?.logoFileId ?? null,
          industry: row.company.profile?.industry ?? row.company.taxonomyDomain ?? null,
          status: row.status,
          approvedAt: row.approvedAt.toISOString(),
          revokedAt: row.revokedAt?.toISOString() ?? null,
          openJobCount: entry?.open ?? 0,
          applicantCount: entry?.applicants ?? 0,
          hireCount: entry?.hires ?? 0,
          lastActivityAt: entry?.last?.toISOString() ?? null,
        };
      }),
      nextCursor: rows.length > query.limit ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  /** In-app notice to the requester and every active OWNER of the company, once per event. */
  private async notifyEmployer(
    tx: Db,
    companyId: string,
    requesterId: string | null,
    notice: {
      dedupePrefix: string;
      title: string;
      body: string;
      metadata: Record<string, unknown>;
    },
  ): Promise<void> {
    const owners = await tx.user.findMany({
      where: { companyId, companyRole: 'OWNER', deactivatedAt: null },
      select: { id: true },
    });
    const recipients = new Set(owners.map((owner) => owner.id));
    if (requesterId) recipients.add(requesterId);
    await createNotices(
      tx,
      [...recipients].map((userId) => ({
        userId,
        kind: 'CAMPUS_ACCESS' as const,
        title: notice.title,
        body: notice.body,
        linkUrl: '/campus-access',
        dedupeKey: `${notice.dedupePrefix}:${userId}`,
        metadata: notice.metadata,
      })),
    );
  }
}
