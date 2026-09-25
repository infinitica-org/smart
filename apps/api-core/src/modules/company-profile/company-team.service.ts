import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CompanyMember,
  DeactivateCompanyMemberRequest,
  InviteRecruiterRequest,
  ListCompanyMembersResponse,
  UpdateCompanyMemberRoleRequest,
} from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { InvitationsService } from '../invitations/invitations.service.js';
import { requireCompanyActor } from './company-access.js';
import { IdempotencyService } from './idempotency.service.js';

type MemberRow = {
  id: string;
  fullName: string;
  email: string;
  companyRole: 'OWNER' | 'RECRUITER' | null;
  passwordHash: string | null;
  deactivatedAt: Date | null;
};

function conflict(error: string, message: string) {
  return new ConflictException({ error, message, statusCode: 409 });
}

/** A member of another company is indistinguishable from a missing one (404, never 403). */
function memberNotFound() {
  return new NotFoundException({
    error: 'not_found',
    message: 'Team member not found.',
    statusCode: 404,
  });
}

export function toCompanyMember(row: MemberRow): CompanyMember {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    role: row.companyRole ?? 'RECRUITER',
    status: row.deactivatedAt ? 'DEACTIVATED' : row.passwordHash ? 'ACTIVE' : 'INVITED',
    deactivatedAt: row.deactivatedAt?.toISOString() ?? null,
  };
}

const MEMBER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  companyRole: true,
  passwordHash: true,
  deactivatedAt: true,
} as const;

@Injectable()
export class CompanyTeamService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(IdempotencyService) private readonly idempotency: IdempotencyService,
    @Inject(InvitationsService) private readonly invitations: InvitationsService,
  ) {}

  async list(userId: string): Promise<ListCompanyMembersResponse> {
    const actor = await requireCompanyActor(this.prisma, userId, 'company.team.view');
    const rows = await this.prisma.user.findMany({
      where: { companyId: actor.companyId, role: 'COMPANY' },
      select: MEMBER_SELECT,
      orderBy: { createdAt: 'asc' },
    });
    return { members: rows.map(toCompanyMember) };
  }

  /** Recruiter invite through the shared invitation flow (same model, token and email as Th6-200). */
  async invite(
    userId: string,
    params: { key: string; body: InviteRecruiterRequest },
  ): Promise<{ invitationId: string; email: string }> {
    const actor = await requireCompanyActor(this.prisma, userId, 'company.team.invite');
    const email = params.body.email.toLowerCase();

    const company = await this.prisma.company.findUnique({ where: { id: actor.companyId } });
    if (!company) throw memberNotFound();
    if (company.verificationStatus !== 'APPROVED' || company.deactivatedAt || company.heldAt) {
      throw conflict(
        'company_not_verified',
        'Recruiters can be invited once the company is verified.',
      );
    }
    if (!params.body.allowExternalDomain && !emailOnCompanyDomain(email, company.domain)) {
      throw new ConflictException({
        error: 'email_domain_mismatch',
        message: `Invitee email must be on ${company.domain}. Owners can override this explicitly.`,
        statusCode: 409,
      });
    }

    const scope = 'employer.invitations.create';
    const request = { ...params.body, email };
    const replayed = await this.findReplay<{ invitationId: string; email: string }>(
      userId,
      scope,
      params.key,
      request,
    );
    if (replayed) return replayed;

    const { invitation } = await this.invitations.createAndEnqueue({
      email,
      fullName: params.body.fullName,
      role: 'COMPANY',
      institutionId: null,
      invitedById: userId,
      companyId: actor.companyId,
      companyRole: 'RECRUITER',
      tenantName: company.name,
    });
    const result = { invitationId: invitation.invitationId, email };
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'company.recruiter_invited',
        resourceType: 'company',
        resourceId: actor.companyId,
        metadata: {
          companyId: actor.companyId,
          invitationId: invitation.invitationId,
          email,
          role: 'RECRUITER',
          externalDomainOverride: params.body.allowExternalDomain,
        },
      },
    });
    await this.storeReplay(userId, scope, params.key, request, result);
    return result;
  }

  async changeRole(
    userId: string,
    params: { key: string; memberId: string; body: UpdateCompanyMemberRoleRequest },
  ): Promise<CompanyMember> {
    const actor = await requireCompanyActor(this.prisma, userId, 'company.team.manage');
    return this.idempotency.run({
      userId,
      scope: `employer.members.role:${params.memberId}`,
      key: params.key,
      request: params.body,
      execute: async (tx) => {
        const member = await this.requireMember(tx, actor.companyId, params.memberId);
        const before = member.companyRole ?? 'RECRUITER';
        if (before === params.body.role) return { result: toCompanyMember(member) };

        if (before === 'OWNER') await this.assertNotLastOwner(tx, actor.companyId, member.id);

        const updated = await tx.user.update({
          where: { id: member.id },
          data: { companyRole: params.body.role },
          select: MEMBER_SELECT,
        });
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: 'company.member_role_changed',
            resourceType: 'user',
            resourceId: member.id,
            metadata: {
              companyId: actor.companyId,
              before: { role: before },
              after: { role: params.body.role },
            },
          },
        });
        return { result: toCompanyMember(updated) };
      },
    });
  }

  async deactivate(
    userId: string,
    params: { key: string; memberId: string; body: DeactivateCompanyMemberRequest },
  ): Promise<CompanyMember> {
    const actor = await requireCompanyActor(this.prisma, userId, 'company.team.manage');
    if (params.memberId === userId) {
      throw conflict('cannot_deactivate_self', 'You cannot deactivate your own account.');
    }
    return this.idempotency.run({
      userId,
      scope: `employer.members.deactivate:${params.memberId}`,
      key: params.key,
      request: params.body,
      execute: async (tx) => {
        const member = await this.requireMember(tx, actor.companyId, params.memberId);
        if (member.deactivatedAt) return { result: toCompanyMember(member) };
        if (member.companyRole === 'OWNER') {
          await this.assertNotLastOwner(tx, actor.companyId, member.id);
        }

        let reassignTo: string | null = null;
        if (params.body.reassignToMemberId) {
          if (params.body.reassignToMemberId === member.id) {
            throw conflict('invalid_reassignment', 'Choose a different teammate to take over.');
          }
          const target = await this.requireMember(
            tx,
            actor.companyId,
            params.body.reassignToMemberId,
          );
          if (target.deactivatedAt) {
            throw conflict('invalid_reassignment', 'The chosen teammate is deactivated.');
          }
          reassignTo = target.id;
        }

        const deactivatedAt = new Date();
        const updated = await tx.user.update({
          where: { id: member.id },
          data: { deactivatedAt },
          select: MEMBER_SELECT,
        });
        // Revoke every live session of the member; API access is also cut off at once because
        // requireCompanyActor reads deactivatedAt from the database on each request.
        await tx.refreshToken.updateMany({
          where: { userId: member.id, revokedAt: null },
          data: { revokedAt: deactivatedAt },
        });
        await this.reassignOpenWork(tx, { fromMemberId: member.id, toMemberId: reassignTo });
        // A deactivated invitee can no longer accept a pending invitation.
        await tx.invitation.updateMany({
          where: { userId: member.id, status: 'PENDING' },
          data: { status: 'REVOKED' },
        });

        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: 'company.member_deactivated',
            resourceType: 'user',
            resourceId: member.id,
            reasonCode: params.body.reason ?? null,
            metadata: {
              companyId: actor.companyId,
              before: { active: true },
              after: { active: false },
              reassignedTo: reassignTo,
            },
          },
        });
        return { result: toCompanyMember(updated) };
      },
    });
  }

  async reactivate(
    userId: string,
    params: { key: string; memberId: string },
  ): Promise<CompanyMember> {
    const actor = await requireCompanyActor(this.prisma, userId, 'company.team.manage');
    return this.idempotency.run({
      userId,
      scope: `employer.members.reactivate:${params.memberId}`,
      key: params.key,
      request: { memberId: params.memberId },
      execute: async (tx) => {
        const member = await this.requireMember(tx, actor.companyId, params.memberId);
        if (!member.deactivatedAt) return { result: toCompanyMember(member) };
        const updated = await tx.user.update({
          where: { id: member.id },
          data: { deactivatedAt: null },
          select: MEMBER_SELECT,
        });
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: 'company.member_reactivated',
            resourceType: 'user',
            resourceId: member.id,
            metadata: {
              companyId: actor.companyId,
              before: { active: false },
              after: { active: true },
            },
          },
        });
        return { result: toCompanyMember(updated) };
      },
    });
  }

  /**
   * Hand the deactivated recruiter's open candidates and conversations to a teammate.
   * TODO(EMP-02 / Th6-353): candidate assignment and employer messaging do not exist as tables yet.
   * When they land, move `fromMemberId`'s open rows to `toMemberId` here so it commits atomically with
   * the deactivation above.
   */
  private async reassignOpenWork(
    _tx: Prisma.TransactionClient,
    _params: { fromMemberId: string; toMemberId: string | null },
  ): Promise<void> {
    await Promise.resolve();
  }

  private async requireMember(
    tx: Prisma.TransactionClient,
    companyId: string,
    memberId: string,
  ): Promise<MemberRow> {
    const member = await tx.user.findFirst({
      where: { id: memberId, companyId, role: 'COMPANY' },
      select: MEMBER_SELECT,
    });
    if (!member) throw memberNotFound();
    return member;
  }

  /** There must always be at least one active OWNER. */
  private async assertNotLastOwner(
    tx: Prisma.TransactionClient,
    companyId: string,
    memberId: string,
  ): Promise<void> {
    const otherOwners = await tx.user.count({
      where: {
        companyId,
        role: 'COMPANY',
        companyRole: 'OWNER',
        deactivatedAt: null,
        id: { not: memberId },
      },
    });
    if (otherOwners === 0) {
      throw conflict(
        'last_owner',
        'A company must always have at least one owner. Assign another owner first.',
      );
    }
  }

  private async findReplay<T>(
    userId: string,
    scope: string,
    key: string,
    request: unknown,
  ): Promise<T | undefined> {
    return this.idempotency.peek<T>({ userId, scope, key, request });
  }

  private async storeReplay(
    userId: string,
    scope: string,
    key: string,
    request: unknown,
    result: unknown,
  ): Promise<void> {
    await this.idempotency.remember({ userId, scope, key, request, result });
  }
}

/** True when the email is on the company domain or one of its subdomains. */
export function emailOnCompanyDomain(email: string, companyDomain: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  const root = companyDomain.trim().toLowerCase();
  if (!domain || !root) return false;
  return domain === root || domain.endsWith(`.${root}`);
}
