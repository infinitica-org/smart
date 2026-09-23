import { describe, expect, it, beforeEach, vi } from 'vitest';
import { InstitutionsService } from './institutions.service.js';
import { InvitationsService } from '../invitations/invitations.service.js';

describe('Account Activation & Institution Configuration (Th6-I186, Th6-I187, Th6-I188)', () => {
  let service: InstitutionsService;
  let invitationsService: InvitationsService;
  let mockPrisma: any;
  let mockOutbox: any;

  beforeEach(() => {
    mockPrisma = {
      institution: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 'inst-1') {
            return Promise.resolve({
              id: 'inst-1',
              name: 'Stanford University',
              domain: 'stanford.edu',
              planId: 'plan-1',
              plan: { code: 'FREE' },
              status: 'ACTIVE',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
          return Promise.resolve(null);
        }),
        update: vi.fn().mockImplementation(({ where, data }) =>
          Promise.resolve({
            id: where.id,
            name: data.name ?? 'Stanford University',
            domain: data.domain ?? 'stanford.edu',
            planId: 'plan-1',
            plan: { code: 'FREE' },
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        ),
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
      institutionAdmin: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    mockOutbox = { publish: vi.fn() };
    invitationsService = new InvitationsService(mockPrisma as any, mockOutbox as any);

    service = new InstitutionsService(
      mockPrisma as any,
      invitationsService,
      { publish: vi.fn() } as any,
      { getJson: vi.fn(), setJson: vi.fn() } as any,
    );
  });

  it('Th6-I188: updates institution configuration settings (name, domains)', async () => {
    const updated = await service.updateInstitutionConfiguration(
      'inst-1',
      {
        name: 'Stanford University Main Campus',
        domains: ['stanford.edu'],
        campuses: ['Palo Alto', 'Redwood City'],
      },
      'admin-user-1',
    );

    expect(updated.name).toBe('Stanford University Main Campus');
    expect(updated.domain).toBe('stanford.edu');
    expect(mockPrisma.institution.update).toHaveBeenCalled();
  });

  it('Th6-I188: throws NotFoundException for invalid institution ID', async () => {
    await expect(
      service.updateInstitutionConfiguration('non-existent', { name: 'Invalid' }, 'admin-user-1'),
    ).rejects.toThrow('Institution not found.');
  });
});
