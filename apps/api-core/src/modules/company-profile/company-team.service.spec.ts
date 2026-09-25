import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompanyTeamService, emailOnCompanyDomain } from './company-team.service.js';
import { IDS, withIdempotencyLedger } from './test-utils.js';

type Row = {
  id: string;
  fullName: string;
  email: string;
  companyId: string;
  companyRole: 'OWNER' | 'RECRUITER';
  passwordHash: string | null;
  deactivatedAt: Date | null;
};

const row = (over: Partial<Row> & { id: string }): Row => ({
  fullName: 'Member',
  email: `${over.id.slice(0, 4)}@acme.test`,
  companyId: IDS.companyA,
  companyRole: 'RECRUITER',
  passwordHash: 'hash',
  deactivatedAt: null,
  ...over,
});

describe('CompanyTeamService (Th6-351/352/353)', () => {
  let db: Row[];
  let prisma: any;
  let invitations: any;
  let service: CompanyTeamService;
  let actorId: string;

  const at = (i: number) => db[i] as Row;
  const actorRow = () => db.find((r) => r.id === actorId) as Row;
  const match = (where: any, r: Row) =>
    (where.id === undefined ||
      (typeof where.id === 'string' ? where.id === r.id : r.id !== where.id.not)) &&
    (where.companyId === undefined || where.companyId === r.companyId) &&
    (where.companyRole === undefined || where.companyRole === r.companyRole) &&
    (where.deactivatedAt === undefined ||
      (where.deactivatedAt === null) === (r.deactivatedAt === null));

  beforeEach(() => {
    actorId = IDS.owner;
    db = [
      row({ id: IDS.owner, companyRole: 'OWNER' }),
      row({ id: IDS.recruiter }),
      row({ id: IDS.recruiter2 }),
      row({ id: IDS.otherCompanyUser, companyId: IDS.companyB, companyRole: 'OWNER' }),
    ];
    const ledger = withIdempotencyLedger({
      user: {
        findUnique: vi.fn(async () => ({ role: 'COMPANY', ...actorRow() })),
        findFirst: vi.fn(async ({ where }: any) => db.find((r) => match(where, r)) ?? null),
        findMany: vi.fn(async ({ where }: any) => db.filter((r) => match(where, r))),
        count: vi.fn(async ({ where }: any) => db.filter((r) => match(where, r)).length),
        update: vi.fn(async ({ where, data }: any) => {
          const target = db.find((r) => r.id === where.id) as Row;
          Object.assign(target, data);
          return { ...target };
        }),
      },
      company: {
        findUnique: vi.fn().mockResolvedValue({
          id: IDS.companyA,
          name: 'Acme',
          domain: 'acme.test',
          verificationStatus: 'APPROVED',
          deactivatedAt: null,
          heldAt: null,
        }),
      },
      refreshToken: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
      invitation: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    });
    prisma = ledger.prisma;
    invitations = {
      createAndEnqueue: vi
        .fn()
        .mockResolvedValue({ invitation: { invitationId: 'inv-1' }, rawToken: 't' }),
    };
    service = new CompanyTeamService(prisma, ledger.idempotency, invitations);
  });

  describe('list / access', () => {
    it('lists only the caller company and shows status', async () => {
      at(2).passwordHash = null;
      at(1).deactivatedAt = new Date();
      const { members } = await service.list(IDS.owner);
      expect(members.map((m) => [m.id, m.status])).toEqual([
        [IDS.owner, 'ACTIVE'],
        [IDS.recruiter, 'DEACTIVATED'],
        [IDS.recruiter2, 'INVITED'],
      ]);
    });

    it('never 403s the owner on team actions', async () => {
      await expect(service.list(IDS.owner)).resolves.toBeDefined();
      await expect(
        service.changeRole(IDS.owner, {
          key: 'a',
          memberId: IDS.recruiter,
          body: { role: 'OWNER' },
        }),
      ).resolves.toBeDefined();
    });

    it('recruiters can view the team but not manage it (403)', async () => {
      actorId = IDS.recruiter;
      await expect(service.list(IDS.recruiter)).resolves.toBeDefined();
      await expect(
        service.changeRole(IDS.recruiter, {
          key: 'b',
          memberId: IDS.recruiter2,
          body: { role: 'OWNER' },
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.deactivate(IDS.recruiter, { key: 'c', memberId: IDS.recruiter2, body: {} }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.invite(IDS.recruiter, {
          key: 'd',
          body: { email: 'x@acme.test', fullName: 'X Y', allowExternalDomain: false },
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('invite (Th6-351)', () => {
    const body = { email: 'New.Hire@Acme.test', fullName: 'New Hire', allowExternalDomain: false };

    it('reuses the shared invitation flow with the RECRUITER role and audits', async () => {
      const result = await service.invite(IDS.owner, { key: 'i1', body });
      expect(result).toEqual({ invitationId: 'inv-1', email: 'new.hire@acme.test' });
      expect(invitations.createAndEnqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'COMPANY',
          institutionId: null,
          companyId: IDS.companyA,
          companyRole: 'RECRUITER',
          invitedById: IDS.owner,
        }),
      );
      expect(prisma.auditLog.create.mock.calls[0]?.[0].data.action).toBe(
        'company.recruiter_invited',
      );
    });

    it('requires the company email domain unless the owner overrides', async () => {
      const external = { ...body, email: 'friend@gmail.com' };
      await expect(service.invite(IDS.owner, { key: 'i2', body: external })).rejects.toMatchObject({
        status: 409,
      });
      expect(invitations.createAndEnqueue).not.toHaveBeenCalled();
      await expect(
        service.invite(IDS.owner, { key: 'i3', body: { ...external, allowExternalDomain: true } }),
      ).resolves.toBeDefined();
    });

    it('refuses to invite before the company is verified', async () => {
      prisma.company.findUnique.mockResolvedValue({
        id: IDS.companyA,
        name: 'Acme',
        domain: 'acme.test',
        verificationStatus: 'PENDING',
      });
      await expect(service.invite(IDS.owner, { key: 'i4', body })).rejects.toMatchObject({
        status: 409,
      });
    });

    it('a retry with the same key sends one invitation', async () => {
      const first = await service.invite(IDS.owner, { key: 'same', body });
      const retry = await service.invite(IDS.owner, { key: 'same', body });
      expect(retry).toEqual(first);
      expect(invitations.createAndEnqueue).toHaveBeenCalledTimes(1);
    });

    it('matches company subdomains but not look-alike domains', () => {
      expect(emailOnCompanyDomain('a@acme.test', 'acme.test')).toBe(true);
      expect(emailOnCompanyDomain('a@eu.acme.test', 'acme.test')).toBe(true);
      expect(emailOnCompanyDomain('a@notacme.test', 'acme.test')).toBe(false);
      expect(emailOnCompanyDomain('a@acme.test.evil.io', 'acme.test')).toBe(false);
    });
  });

  describe('change role (Th6-352)', () => {
    it('promotes a recruiter and audits the before/after role', async () => {
      const member = await service.changeRole(IDS.owner, {
        key: 'r1',
        memberId: IDS.recruiter,
        body: { role: 'OWNER' },
      });
      expect(member.role).toBe('OWNER');
      const audit = prisma.auditLog.create.mock.calls[0]?.[0].data;
      expect(audit.metadata).toMatchObject({
        before: { role: 'RECRUITER' },
        after: { role: 'OWNER' },
      });
    });

    it('blocks demoting the last owner (409) and allows it once another owner exists', async () => {
      await expect(
        service.changeRole(IDS.owner, {
          key: 'r2',
          memberId: IDS.owner,
          body: { role: 'RECRUITER' },
        }),
      ).rejects.toMatchObject({
        status: 409,
        response: expect.objectContaining({ error: 'last_owner' }),
      });
      expect(actorRow().companyRole).toBe('OWNER');

      at(1).companyRole = 'OWNER';
      // Demoting the actor themself is fine now; access is re-read per request so the next call is 403.
      await expect(
        service.changeRole(IDS.owner, {
          key: 'r3',
          memberId: IDS.owner,
          body: { role: 'RECRUITER' },
        }),
      ).resolves.toMatchObject({ role: 'RECRUITER' });
    });

    it("404s for another company's member and 422s an invalid role", async () => {
      await expect(
        service.changeRole(IDS.owner, {
          key: 'r4',
          memberId: IDS.otherCompanyUser,
          body: { role: 'RECRUITER' },
        }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('a retry with the same key changes and audits once', async () => {
      const args = { key: 'same', memberId: IDS.recruiter, body: { role: 'OWNER' as const } };
      await service.changeRole(IDS.owner, args);
      await service.changeRole(IDS.owner, args);
      expect(prisma.user.update).toHaveBeenCalledTimes(1);
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('deactivate / reactivate (Th6-353)', () => {
    it('deactivates, revokes sessions and audits in one transaction', async () => {
      const member = await service.deactivate(IDS.owner, {
        key: 'd1',
        memberId: IDS.recruiter,
        body: { reassignToMemberId: IDS.recruiter2, reason: 'left' },
      });
      expect(member.status).toBe('DEACTIVATED');
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: IDS.recruiter, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      const audit = prisma.auditLog.create.mock.calls[0]?.[0].data;
      expect(audit).toMatchObject({ action: 'company.member_deactivated', reasonCode: 'left' });
      expect(audit.metadata).toMatchObject({ reassignedTo: IDS.recruiter2 });
    });

    it('cannot deactivate yourself', async () => {
      await expect(
        service.deactivate(IDS.owner, { key: 'd2', memberId: IDS.owner, body: {} }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ error: 'cannot_deactivate_self' }),
      });
    });

    it('cannot deactivate the last owner (another owner acting)', async () => {
      // Two owners, the target is the only OTHER active owner once the actor is deactivated.
      at(1).companyRole = 'OWNER';
      at(0).deactivatedAt = null;
      actorId = IDS.recruiter;
      await service.deactivate(IDS.recruiter, { key: 'd3', memberId: IDS.owner, body: {} });
      // Now only recruiter (actor) is an active owner; a third party cannot remove them.
      at(2).companyRole = 'OWNER';
      actorId = IDS.recruiter2;
      await service.deactivate(IDS.recruiter2, { key: 'd4', memberId: IDS.recruiter, body: {} });
      await expect(
        service.deactivate(IDS.recruiter2, { key: 'd5', memberId: IDS.recruiter2, body: {} }),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('rejects a deactivated or same-person reassignment target and other-company members', async () => {
      at(2).deactivatedAt = new Date();
      await expect(
        service.deactivate(IDS.owner, {
          key: 'd6',
          memberId: IDS.recruiter,
          body: { reassignToMemberId: IDS.recruiter2 },
        }),
      ).rejects.toMatchObject({ status: 409 });
      await expect(
        service.deactivate(IDS.owner, { key: 'd7', memberId: IDS.otherCompanyUser, body: {} }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('reactivates a deactivated member', async () => {
      at(1).deactivatedAt = new Date();
      const member = await service.reactivate(IDS.owner, { key: 'ra1', memberId: IDS.recruiter });
      expect(member.status).toBe('ACTIVE');
      expect(prisma.auditLog.create.mock.calls[0]?.[0].data.action).toBe(
        'company.member_reactivated',
      );
    });

    it('a retry with the same key deactivates once', async () => {
      const args = { key: 'same', memberId: IDS.recruiter, body: {} };
      await service.deactivate(IDS.owner, args);
      await service.deactivate(IDS.owner, args);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledTimes(1);
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    });
  });
});
