import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganizationsService } from './organizations.service.js';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prismaMock: any;
  let auditPublisherMock: any;

  beforeEach(() => {
    prismaMock = {
      organization: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    auditPublisherMock = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    service = new OrganizationsService(prismaMock, auditPublisherMock);
  });

  describe('resolveOrCreateOrganization', () => {
    it('should return existing Organization when domain matches', async () => {
      const existingOrg = {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Acme Corp',
        domain: 'acme.com',
        verificationStatus: 'APPROVED',
      };

      prismaMock.organization.findFirst.mockResolvedValueOnce(existingOrg);

      const result = await service.resolveOrCreateOrganization({
        name: 'Acme',
        website: 'https://acme.com',
      });

      expect(result).toEqual(existingOrg);
      expect(prismaMock.organization.findFirst).toHaveBeenCalledWith({
        where: { domain: 'acme.com' },
      });
      expect(prismaMock.organization.create).not.toHaveBeenCalled();
    });

    it('should return existing Organization when name matches case-insensitively', async () => {
      const existingOrg = {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Stark Industries',
        domain: null,
        verificationStatus: 'PENDING',
      };

      prismaMock.organization.findFirst.mockResolvedValueOnce(existingOrg); // name check

      const result = await service.resolveOrCreateOrganization({
        name: 'stark industries',
      });

      expect(result).toEqual(existingOrg);
      expect(prismaMock.organization.create).not.toHaveBeenCalled();
    });

    it('should create an unverified Organization (PENDING) when no match is found', async () => {
      const createdOrg = {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Wayne Enterprises',
        domain: 'wayne.com',
        verificationStatus: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.organization.findFirst
        .mockResolvedValueOnce(null) // domain check
        .mockResolvedValueOnce(null) // name check
        .mockResolvedValueOnce(null); // domain availability check

      prismaMock.organization.create.mockResolvedValueOnce(createdOrg);

      const result = await service.resolveOrCreateOrganization({
        name: 'Wayne Enterprises',
        website: 'https://wayne.com',
      });

      expect(result).toEqual(createdOrg);
      expect(prismaMock.organization.create).toHaveBeenCalledWith({
        data: {
          name: 'Wayne Enterprises',
          domain: 'wayne.com',
          verificationStatus: 'PENDING',
        },
      });
    });
  });

  describe('getOrganization', () => {
    it('should return organization by ID', async () => {
      const org = {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Acme Corp',
        domain: 'acme.com',
        companies: [],
      };

      prismaMock.organization.findUnique.mockResolvedValueOnce(org);

      const result = await service.getOrganization(org.id);
      expect(result).toEqual(org);
    });

    it('should throw NotFoundException if organization does not exist', async () => {
      prismaMock.organization.findUnique.mockResolvedValueOnce(null);

      await expect(service.getOrganization('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateVerificationStatus', () => {
    it('should update verification status and emit audit log', async () => {
      const updatedOrg = {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Acme Corp',
        verificationStatus: 'APPROVED',
        verificationReason: 'Verified via document match',
      };

      prismaMock.organization.update.mockResolvedValueOnce(updatedOrg);

      const result = await service.updateVerificationStatus(
        updatedOrg.id,
        'APPROVED',
        'Verified via document match',
        'actor-uuid',
      );

      expect(result).toEqual(updatedOrg);
      expect(auditPublisherMock.record).toHaveBeenCalledWith({
        actorId: 'actor-uuid',
        action: 'organization.verification_updated',
        resourceType: 'organization',
        resourceId: updatedOrg.id,
        reasonCode: 'approved',
        metadata: {
          verificationStatus: 'APPROVED',
          verificationReason: 'Verified via document match',
        },
      });
    });
  });
});
