import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { COMPANY_ABOUT_MAX_LENGTH, UpdateCompanyProfileRequestSchema } from '@smart/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompanyProfileService } from './company-profile.service.js';
import { parseIfMatch } from './employer.controller.js';
import { IDS, withIdempotencyLedger } from './test-utils.js';

const company = (over: Record<string, unknown> = {}) => ({
  id: IDS.companyA,
  name: 'Acme Robotics',
  website: 'https://acme.test',
  location: 'Bengaluru',
  taxonomyDomain: 'Software & Technology',
  verificationStatus: 'APPROVED',
  deactivatedAt: null,
  heldAt: null,
  ...over,
});

const profileRow = (over: Record<string, unknown> = {}) => ({
  companyId: IDS.companyA,
  slug: 'acme-robotics-11111111',
  displayName: 'Acme Robotics',
  logoFileId: null,
  website: 'https://acme.test',
  about: null,
  benefits: [],
  socialLinks: {},
  industry: 'Software & Technology',
  employeeCount: null,
  headquarters: 'Bengaluru',
  additionalLocations: [],
  version: 1,
  ...over,
});

const user = (over: Record<string, unknown> = {}) => ({
  role: 'COMPANY',
  companyId: IDS.companyA,
  companyRole: 'OWNER',
  deactivatedAt: null,
  ...over,
});

describe('CompanyProfileService (Th6-349/350)', () => {
  let prisma: any;
  let service: CompanyProfileService;
  let stored: ReturnType<typeof profileRow>;

  beforeEach(() => {
    stored = profileRow();
    const ledger = withIdempotencyLedger({
      user: { findUnique: vi.fn().mockResolvedValue(user()) },
      company: {
        findUnique: vi.fn().mockResolvedValue(company()),
        update: vi.fn().mockResolvedValue({}),
      },
      companyVerification: {
        findFirst: vi.fn().mockResolvedValue({ reviewedAt: new Date('2026-09-01T00:00:00Z') }),
      },
      companyProfile: {
        findFirst: vi.fn().mockImplementation(async () => ({ ...stored, company: company() })),
        findUnique: vi.fn().mockImplementation(async () => ({ ...stored })),
        create: vi.fn(),
        updateMany: vi.fn().mockImplementation(async ({ where, data }: any) => {
          if (where.version !== stored.version) return { count: 0 };
          stored = { ...stored, ...data, version: stored.version + 1 };
          return { count: 1 };
        }),
        findUniqueOrThrow: vi.fn().mockImplementation(async () => ({ ...stored })),
      },
    });
    prisma = ledger.prisma;
    service = new CompanyProfileService(prisma, ledger.idempotency);
  });

  describe('public page', () => {
    it('serves a verified company with its verification date', async () => {
      const dto = await service.getPublic('acme-robotics-11111111');
      expect(dto).toMatchObject({ displayName: 'Acme Robotics', isVerified: true });
      expect(dto.verifiedAt).toBe('2026-09-01T00:00:00.000Z');
    });

    it.each(['PENDING', 'REJECTED'])('returns 404 for a %s company', async (status) => {
      prisma.companyProfile.findFirst.mockResolvedValue({
        ...stored,
        company: company({ verificationStatus: status }),
      });
      await expect(service.getPublic('acme-robotics-11111111')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns 404 for a held or deactivated company and an unknown slug', async () => {
      prisma.companyProfile.findFirst.mockResolvedValue({
        ...stored,
        company: company({ heldAt: new Date() }),
      });
      await expect(service.getPublic('acme-robotics-11111111')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      prisma.companyProfile.findFirst.mockResolvedValue(null);
      await expect(service.getPublic('nope')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('hides the verified badge data for an unverified company in the editor view', async () => {
      prisma.company.findUnique.mockResolvedValue(company({ verificationStatus: 'PENDING' }));
      const dto = await service.getForEditor(IDS.owner);
      expect(dto).toMatchObject({ isVerified: false, verifiedAt: null });
      expect(prisma.companyVerification.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('access', () => {
    it('lets the owner read and edit their own company (never 403)', async () => {
      await expect(service.getForEditor(IDS.owner)).resolves.toMatchObject({
        companyId: IDS.companyA,
      });
      await expect(
        service.update(IDS.owner, { key: 'k1', expectedVersion: 1, body: { about: 'Hi' } }),
      ).resolves.toMatchObject({ about: 'Hi' });
    });

    it('lets a recruiter with the profile permission edit', async () => {
      prisma.user.findUnique.mockResolvedValue(user({ companyRole: 'RECRUITER' }));
      await expect(service.getForEditor(IDS.recruiter)).resolves.toBeDefined();
    });

    it.each([
      ['a non-company user', { role: 'STUDENT', companyId: null, companyRole: null }],
      ['a user with no company', { companyId: null }],
      ['a deactivated member', { deactivatedAt: new Date() }],
    ])('rejects %s with 403', async (_label, over) => {
      prisma.user.findUnique.mockResolvedValue(user(over));
      await expect(service.getForEditor(IDS.otherCompanyUser)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("only ever writes the caller's own company (cross-company ids are ignored)", async () => {
      prisma.user.findUnique.mockResolvedValue(user({ companyId: IDS.companyB }));
      prisma.company.findUnique.mockResolvedValue(company({ id: IDS.companyB }));
      await service.update(IDS.otherCompanyUser, {
        key: 'k-b',
        expectedVersion: 1,
        body: { about: 'B only' },
      });
      expect(prisma.companyProfile.updateMany.mock.calls[0]?.[0].where.companyId).toBe(
        IDS.companyB,
      );
    });
  });

  describe('update', () => {
    it('bumps the version, mirrors registration columns and audits before/after', async () => {
      const dto = await service.update(IDS.owner, {
        key: 'k2',
        expectedVersion: 1,
        body: { industry: 'Automotive', headquarters: 'Pune', employeeCount: 'E_51_200' },
      });
      expect(dto.version).toBe(2);
      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: IDS.companyA },
        data: { taxonomyDomain: 'Automotive', location: 'Pune' },
      });
      const audit = prisma.auditLog.create.mock.calls[0]?.[0].data;
      expect(audit).toMatchObject({ actorId: IDS.owner, action: 'company.profile_updated' });
      expect(audit.metadata.before.version).toBe(1);
      expect(audit.metadata.after.version).toBe(2);
      expect(audit.metadata.after.industry).toBe('Automotive');
    });

    it('answers 409 for a stale version and changes nothing', async () => {
      stored = profileRow({ version: 4 });
      await expect(
        service.update(IDS.owner, { key: 'k3', expectedVersion: 3, body: { about: 'x' } }),
      ).rejects.toMatchObject({ status: 409 });
      expect(prisma.companyProfile.updateMany).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('answers 409 when a concurrent save wins the optimistic lock', async () => {
      prisma.companyProfile.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        service.update(IDS.owner, { key: 'k4', expectedVersion: 1, body: { about: 'x' } }),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('refuses a logo that was not uploaded to this company', async () => {
      await expect(
        service.update(IDS.owner, {
          key: 'k5',
          expectedVersion: 1,
          body: { logoFileId: `company-logos/${IDS.companyB}/x.png` },
        }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('a retry with the same Idempotency-Key does not write twice', async () => {
      const first = await service.update(IDS.owner, {
        key: 'same',
        expectedVersion: 1,
        body: { about: 'Once' },
      });
      const retry = await service.update(IDS.owner, {
        key: 'same',
        expectedVersion: 1,
        body: { about: 'Once' },
      });
      expect(retry).toEqual(first);
      expect(prisma.companyProfile.updateMany).toHaveBeenCalledTimes(1);
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    });

    it('rejects reuse of a key with a different payload', async () => {
      await service.update(IDS.owner, { key: 'dup', expectedVersion: 1, body: { about: 'A' } });
      await expect(
        service.update(IDS.owner, { key: 'dup', expectedVersion: 1, body: { about: 'B' } }),
      ).rejects.toMatchObject({ status: 409 });
    });
  });
});

describe('UpdateCompanyProfileRequestSchema (shared client/server validation)', () => {
  it('accepts values from the dropdowns', () => {
    expect(
      UpdateCompanyProfileRequestSchema.safeParse({
        industry: 'Automotive',
        employeeCount: 'E_1000_PLUS',
        headquarters: 'Pune, India',
        additionalLocations: ['Chennai'],
      }).success,
    ).toBe(true);
  });

  it('validates dropdown values server-side', () => {
    expect(UpdateCompanyProfileRequestSchema.safeParse({ employeeCount: '5000' }).success).toBe(
      false,
    );
    expect(UpdateCompanyProfileRequestSchema.safeParse({ industry: 'Wizardry' }).success).toBe(
      false,
    );
  });

  it('caps the description at 2000 characters and rejects unknown social networks', () => {
    expect(
      UpdateCompanyProfileRequestSchema.safeParse({ about: 'a'.repeat(COMPANY_ABOUT_MAX_LENGTH) })
        .success,
    ).toBe(true);
    const tooLong = UpdateCompanyProfileRequestSchema.safeParse({
      about: 'a'.repeat(COMPANY_ABOUT_MAX_LENGTH + 1),
    });
    expect(tooLong.success).toBe(false);
    expect(tooLong.error?.issues[0]?.path).toEqual(['about']);
    expect(
      UpdateCompanyProfileRequestSchema.safeParse({ socialLinks: { myspace: 'https://x.test' } })
        .success,
    ).toBe(false);
  });
});

describe('parseIfMatch', () => {
  it('reads plain, quoted and weak versions', () => {
    expect(parseIfMatch('3')).toBe(3);
    expect(parseIfMatch('"3"')).toBe(3);
    expect(parseIfMatch('W/"3"')).toBe(3);
  });
  it('requires the header (428) and a numeric value (400)', () => {
    expect(() => parseIfMatch(undefined)).toThrowError(expect.objectContaining({ status: 428 }));
    expect(() => parseIfMatch('abc')).toThrowError(expect.objectContaining({ status: 400 }));
  });
});
