import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompaniesService } from './companies.service.js';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let prismaMock: any;
  let auditPublisherMock: any;
  let redisMock: any;

  const freePlan = { id: 'plan-free', code: 'FREE' };

  beforeEach(() => {
    prismaMock = {
      subscriptionPlan: {
        findUnique: vi.fn().mockResolvedValue(freePlan),
      },
      organization: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      company: {
        findUnique: vi.fn().mockResolvedValue(null), // uniqueSlug: no collision
        create: vi.fn(),
      },
      user: {
        count: vi.fn().mockResolvedValue(0),
      },
    };

    auditPublisherMock = { record: vi.fn().mockResolvedValue(undefined) };
    redisMock = { del: vi.fn().mockResolvedValue(undefined) };

    service = new CompaniesService(prismaMock, auditPublisherMock, redisMock);
  });

  describe('createCompany — Organization domain linking (INF-07)', () => {
    /**
     * Regression coverage: this used to store the raw `website` URL (scheme
     * and path included) straight into Organization.domain instead of the
     * extracted hostname. That broke both dedup (the same company matched
     * via extractDomain() elsewhere would never find this row) and every
     * downstream `https://${org.domain}` reconstruction (e.g. WE-T03
     * manager-endorsement domain matching), which degenerated to the
     * nonsense hostname "https".
     */
    it('extracts a bare hostname from a full website URL before matching or creating an Organization', async () => {
      prismaMock.organization.findFirst.mockResolvedValue(null);
      prismaMock.organization.create.mockResolvedValue({
        id: 'org-1',
        name: 'Acme Corp',
        domain: 'acme.com',
        verificationStatus: 'APPROVED',
      });
      prismaMock.company.create.mockResolvedValue({ id: 'company-1' });
      prismaMock.company.findUnique.mockImplementation((args: any) =>
        args.where.id === 'company-1'
          ? Promise.resolve({
              id: 'company-1',
              organizationId: 'org-1',
              name: 'Acme Corp',
              domain: 'acme-corp',
              taxonomyDomain: null,
              website: 'https://acme.com/careers',
              sector: null,
              mode: null,
              sizeBand: null,
              location: null,
              verificationStatus: 'APPROVED',
              verificationReason: null,
              heldAt: null,
              deactivatedAt: null,
              createdAt: new Date('2026-01-01'),
              plan: freePlan,
            })
          : Promise.resolve(null),
      );

      await service.createCompany(
        { name: 'Acme Corp', website: 'https://acme.com/careers' } as any,
        'actor-1',
      );

      expect(prismaMock.organization.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ name: { equals: 'Acme Corp', mode: 'insensitive' } }, { domain: 'acme.com' }],
        },
      });
      expect(prismaMock.organization.create).toHaveBeenCalledWith({
        data: { name: 'Acme Corp', domain: 'acme.com', verificationStatus: 'APPROVED' },
      });
    });

    it('reuses an existing Organization matched by the extracted domain instead of creating a duplicate', async () => {
      const existingOrg = {
        id: 'org-existing',
        name: 'Acme Corp',
        domain: 'acme.com',
        verificationStatus: 'PENDING',
      };
      prismaMock.organization.findFirst.mockResolvedValue(existingOrg);
      prismaMock.company.create.mockResolvedValue({ id: 'company-2' });
      prismaMock.company.findUnique.mockImplementation((args: any) =>
        args.where.id === 'company-2'
          ? Promise.resolve({
              id: 'company-2',
              organizationId: existingOrg.id,
              name: 'Acme Corp',
              domain: 'acme-corp',
              taxonomyDomain: null,
              website: 'https://acme.com',
              sector: null,
              mode: null,
              sizeBand: null,
              location: null,
              verificationStatus: 'APPROVED',
              verificationReason: null,
              heldAt: null,
              deactivatedAt: null,
              createdAt: new Date('2026-01-01'),
              plan: freePlan,
            })
          : Promise.resolve(null),
      );

      await service.createCompany(
        { name: 'Acme Corp', website: 'https://acme.com' } as any,
        'actor-1',
      );

      expect(prismaMock.organization.create).not.toHaveBeenCalled();
      expect(prismaMock.company.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ organizationId: existingOrg.id }),
        }),
      );
    });

    it('creates an Organization with a null domain when no website is provided', async () => {
      prismaMock.organization.findFirst.mockResolvedValue(null);
      prismaMock.organization.create.mockResolvedValue({
        id: 'org-3',
        name: 'No Website Inc',
        domain: null,
        verificationStatus: 'APPROVED',
      });
      prismaMock.company.create.mockResolvedValue({ id: 'company-3' });
      prismaMock.company.findUnique.mockImplementation((args: any) =>
        args.where.id === 'company-3'
          ? Promise.resolve({
              id: 'company-3',
              organizationId: 'org-3',
              name: 'No Website Inc',
              domain: 'no-website-inc',
              taxonomyDomain: null,
              website: null,
              sector: null,
              mode: null,
              sizeBand: null,
              location: null,
              verificationStatus: 'APPROVED',
              verificationReason: null,
              heldAt: null,
              deactivatedAt: null,
              createdAt: new Date('2026-01-01'),
              plan: freePlan,
            })
          : Promise.resolve(null),
      );

      await service.createCompany({ name: 'No Website Inc' } as any, 'actor-1');

      expect(prismaMock.organization.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ name: { equals: 'No Website Inc', mode: 'insensitive' } }] },
      });
      expect(prismaMock.organization.create).toHaveBeenCalledWith({
        data: { name: 'No Website Inc', domain: null, verificationStatus: 'APPROVED' },
      });
    });
  });

  describe('registerSelfServe', () => {
    it('creates the Company at PENDING (not APPROVED) and writes no audit row', async () => {
      prismaMock.organization.findFirst.mockResolvedValue(null);
      prismaMock.organization.create.mockResolvedValue({
        id: 'org-4',
        name: 'Employer Co',
        domain: null,
        verificationStatus: 'APPROVED',
      });
      prismaMock.company.create.mockResolvedValue({ id: 'company-4', organizationId: 'org-4' });

      const result = await service.registerSelfServe({
        companyName: 'Employer Co',
        website: undefined,
        sector: undefined,
        mode: undefined,
        sizeBand: undefined,
        location: undefined,
      } as any);

      expect(result).toEqual({ id: 'company-4', organizationId: 'org-4' });
      expect(prismaMock.company.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Employer Co', verificationStatus: 'PENDING' }),
        }),
      );
      expect(auditPublisherMock.record).not.toHaveBeenCalled();
    });
  });
});
