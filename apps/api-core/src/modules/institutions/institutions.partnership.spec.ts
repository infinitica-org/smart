import { describe, expect, it, beforeEach, vi } from 'vitest';
import { InstitutionsService } from './institutions.service.js';

describe('InstitutionsService Partnership Workflow', () => {
  let service: InstitutionsService;
  let mockPrisma: any;
  let mockInvitations: any;
  let mockAudit: any;
  let mockRedis: any;

  beforeEach(() => {
    mockPrisma = {
      institution: {
        findUnique: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'inst-123',
            name: data.name,
            domain: data.domain,
            planId: 'plan-1',
            plan: { code: 'FREE' },
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        ),
      },
      subscriptionPlan: {
        findUnique: vi.fn().mockResolvedValue({ id: 'plan-1', code: 'FREE' }),
      },
      institutionAdmin: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([]),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      invitation: {
        findMany: vi.fn().mockResolvedValue([]),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      batch: {
        findMany: vi.fn().mockResolvedValue([]),
        groupBy: vi.fn().mockResolvedValue([]),
      },
    };
    mockInvitations = {};
    mockAudit = { publish: vi.fn() };
    mockRedis = { getJson: vi.fn(), setJson: vi.fn() };

    service = new InstitutionsService(
      mockPrisma,
      mockInvitations as any,
      mockAudit as any,
      mockRedis as any,
    );
  });

  it('Th6-I182: creates a partnership request', async () => {
    const req = await service.createPartnershipRequest({
      name: 'Stanford University',
      domain: 'stanford.edu',
      contactName: 'Jane Doe',
      contactEmail: 'jane@stanford.edu',
      contactPhone: '+16507232300',
      estimatedStudents: 15000,
      notes: 'Partnership inquiry',
    });

    expect(req.id).toBeDefined();
    expect(req.status).toBe('PENDING');
    expect(req.name).toBe('Stanford University');
  });

  it('Th6-I182: rejects duplicate pending partnership request for same domain', async () => {
    await service.createPartnershipRequest({
      name: 'Stanford University',
      domain: 'stanford.edu',
      contactName: 'Jane Doe',
      contactEmail: 'jane@stanford.edu',
    });

    await expect(
      service.createPartnershipRequest({
        name: 'Stanford University Duplicate',
        domain: 'stanford.edu',
        contactName: 'John Smith',
        contactEmail: 'john@stanford.edu',
      }),
    ).rejects.toThrow('A pending partnership request for this domain already exists.');
  });

  it('Th6-I183: lists and retrieves partnership requests', async () => {
    const created = await service.createPartnershipRequest({
      name: 'MIT',
      domain: 'mit.edu',
      contactName: 'Tim Berners',
      contactEmail: 'tim@mit.edu',
    });

    const list = await service.listPartnershipRequests({ status: 'PENDING' } as any);
    expect(list.total).toBe(1);
    expect(list.items[0].id).toBe(created.id);

    const fetched = await service.getPartnershipRequestById(created.id);
    expect(fetched.domain).toBe('mit.edu');
  });

  it('Th6-I184: reviews partnership request decision (APPROVED / REJECTED / MORE_INFO_NEEDED)', async () => {
    const created = await service.createPartnershipRequest({
      name: 'Harvard University',
      domain: 'harvard.edu',
      contactName: 'Admin',
      contactEmail: 'admin@harvard.edu',
    });

    const reviewed = await service.reviewPartnershipRequest(
      created.id,
      { decision: 'APPROVED', reviewNotes: 'Verified domain and accreditation' },
      'admin-user-1',
    );

    expect(reviewed.status).toBe('APPROVED');
    expect(reviewed.reviewNotes).toBe('Verified domain and accreditation');
  });

  it('Th6-I185: provisions university account from partnership request', async () => {
    const created = await service.createPartnershipRequest({
      name: 'Oxford University',
      domain: 'ox.ac.uk',
      contactName: 'TPO Oxford',
      contactEmail: 'tpo@ox.ac.uk',
    });

    const provisionResult = await service.provisionUniversityAccount(created.id, 'admin-user-1');
    expect(provisionResult.partnershipRequest.status).toBe('PROVISIONED');
    expect(provisionResult.institution.name).toBe('Oxford University');
    expect(provisionResult.institution.domain).toBe('ox.ac.uk');
  });

  it('Th6-I189: checks decision status and next steps for partnership request', async () => {
    const created = await service.createPartnershipRequest({
      name: 'Cambridge University',
      domain: 'cam.ac.uk',
      contactName: 'TPO Cambridge',
      contactEmail: 'tpo@cam.ac.uk',
    });

    let decision = await service.getPartnershipDecision(created.id);
    expect(decision.status).toBe('PENDING');
    expect(decision.nextSteps).toContain('currently under review');

    await service.provisionUniversityAccount(created.id, 'admin-user-1');

    decision = await service.getPartnershipDecision(created.id);
    expect(decision.status).toBe('PROVISIONED');
    expect(decision.nextSteps).toContain('workspace has been successfully provisioned');
  });
});
