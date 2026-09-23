import { ConflictException, GoneException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { InvitationsService } from './invitations.service.js';
import { generateInviteToken } from './invite-token.util.js';

describe('InvitationsService', () => {
  const { raw: validToken, hash: validHash } = generateInviteToken();

  const mockPrisma = {
    invitation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const mockOutbox = {
    enqueueEnvelope: vi.fn(),
  };

  const mockAuditPublisher = {
    record: vi.fn(),
  };

  let service: InvitationsService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new InvitationsService(
      mockPrisma as never,
      mockOutbox as never,
      mockAuditPublisher as never,
    );

    // Default $transaction implementation executes callback directly
    mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockPrisma) => unknown) =>
      cb(mockPrisma),
    );
  });

  describe('preview', () => {
    it('returns invitation preview for valid pending token', async () => {
      const expiresAt = new Date(Date.now() + 86400000);
      mockPrisma.invitation.findUnique.mockResolvedValue({
        id: 'inv_123',
        tokenHash: validHash,
        status: 'PENDING',
        expiresAt,
        fullName: 'Dr. Sarah Connor',
        email: 'sarah@university.edu',
        role: 'INSTITUTION_ADMIN',
        institution: { name: 'State University' },
        batch: null,
      });

      const result = await service.preview(validToken);

      expect(result).toEqual({
        fullName: 'Dr. Sarah Connor',
        email: 'sarah@university.edu',
        role: 'INSTITUTION_ADMIN',
        institutionName: 'State University',
        batchName: null,
        expiresAt: expiresAt.toISOString(),
        status: 'PENDING',
      });
    });

    it('throws NotFoundException for non-existent token', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue(null);

      await expect(service.preview('invalid_token')).rejects.toThrow(NotFoundException);
    });
  });

  describe('accept', () => {
    it('activates user account, updates invitation status, and emits audit event', async () => {
      const expiresAt = new Date(Date.now() + 86400000);
      const invitation = {
        id: 'inv_123',
        userId: 'usr_456',
        institutionId: 'inst_789',
        tokenHash: validHash,
        status: 'PENDING',
        expiresAt,
        fullName: 'Sarah Connor',
        email: 'sarah@university.edu',
        role: 'PLACEMENT_STAFF',
      };

      const updatedUser = {
        id: 'usr_456',
        fullName: 'Sarah Connor',
        email: 'sarah@university.edu',
        role: 'PLACEMENT_STAFF',
        institutionId: 'inst_789',
        emailVerified: true,
      };

      mockPrisma.invitation.findUnique.mockResolvedValue(invitation);
      mockPrisma.user.update.mockResolvedValue(updatedUser);
      mockPrisma.invitation.update.mockResolvedValue({
        ...invitation,
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      });

      const result = await service.accept(validToken, 'SecurePass123!');

      expect(result).toEqual(updatedUser);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'usr_456' },
          data: expect.objectContaining({
            emailVerified: true,
            fullName: 'Sarah Connor',
          }),
        }),
      );
      expect(mockPrisma.invitation.update).toHaveBeenCalledWith({
        where: { id: 'inv_123' },
        data: expect.objectContaining({
          status: 'ACCEPTED',
        }),
      });
      expect(mockAuditPublisher.record).toHaveBeenCalledWith({
        actorId: 'usr_456',
        action: 'staff.account_activated',
        resourceType: 'user',
        resourceId: 'usr_456',
        reasonCode: 'INVITATION_ACCEPTED',
        metadata: {
          institutionId: 'inst_789',
          previousState: 'INVITED',
          newState: 'ACTIVE',
          role: 'PLACEMENT_STAFF',
          invitationId: 'inv_123',
        },
      });
    });

    it('throws ConflictException (409) if invitation is already ACCEPTED without side effects', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue({
        id: 'inv_123',
        status: 'ACCEPTED',
        expiresAt: new Date(Date.now() + 86400000),
      });

      await expect(service.accept(validToken, 'SecurePass123!')).rejects.toThrow(ConflictException);

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockAuditPublisher.record).not.toHaveBeenCalled();
    });

    it('throws GoneException (410) if invitation is REVOKED', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue({
        id: 'inv_123',
        status: 'REVOKED',
        expiresAt: new Date(Date.now() + 86400000),
      });

      await expect(service.accept(validToken, 'SecurePass123!')).rejects.toThrow(GoneException);

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockAuditPublisher.record).not.toHaveBeenCalled();
    });

    it('throws GoneException (410) if invitation has EXPIRED', async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue({
        id: 'inv_123',
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
      });

      await expect(service.accept(validToken, 'SecurePass123!')).rejects.toThrow(GoneException);

      expect(mockPrisma.invitation.update).toHaveBeenCalledWith({
        where: { id: 'inv_123' },
        data: { status: 'EXPIRED' },
      });
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockAuditPublisher.record).not.toHaveBeenCalled();
    });
  });
});
