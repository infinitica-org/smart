import { randomUUID } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { CreateDataRequestSchema, DeactivateAccountRequestSchema } from '@smart/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountService } from './account.service.js';

describe('AccountService (STU-02)', () => {
  let prisma: any;
  let auditPublisher: any;
  let auth: any;
  let service: AccountService;

  const userId = randomUUID();

  beforeEach(() => {
    prisma = {
      user: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          fullName: 'Ada Lovelace',
          email: 'ada@example.com',
          graduationYear: 2027,
          allowEmployerMessages: true,
          deactivatedAt: null,
        }),
        update: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            fullName: 'Ada L',
            email: 'ada@example.com',
            graduationYear: 2027,
            ...data,
          }),
        ),
      },
      dataSubjectRequest: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: randomUUID(),
            status: 'OPEN',
            createdAt: new Date('2026-09-24T00:00:00Z'),
            resolvedAt: null,
            ...data,
          }),
        ),
      },
    };
    auditPublisher = { record: vi.fn().mockResolvedValue(undefined) };
    auth = { revokeAllForUser: vi.fn().mockResolvedValue(undefined) };
    service = new AccountService(prisma, auditPublisher, auth);
  });

  describe('updatePersonalInfo', () => {
    it('updates the profile and audits the prior and new state', async () => {
      const result = await service.updatePersonalInfo(userId, {
        fullName: 'Ada L',
        graduationYear: 2028,
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: { fullName: 'Ada L', graduationYear: 2028 },
        }),
      );
      expect(result.fullName).toBe('Ada L');
      expect(auditPublisher.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: userId,
          action: 'personal_info.updated',
          metadata: {
            prior: { fullName: 'Ada Lovelace', graduationYear: 2027 },
            next: { fullName: 'Ada L', graduationYear: 2028 },
          },
        }),
      );
    });

    it('leaves graduationYear untouched when it is not supplied', async () => {
      await service.updatePersonalInfo(userId, { fullName: 'Ada L' });
      expect(prisma.user.update.mock.calls[0][0].data).toEqual({ fullName: 'Ada L' });
    });
  });

  describe('updateMessagingPreference', () => {
    it('persists the switch and audits it', async () => {
      const result = await service.updateMessagingPreference(userId, {
        allowEmployerMessages: false,
      });
      expect(result).toEqual({ allowEmployerMessages: false });
      expect(auditPublisher.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'messaging_preference.updated' }),
      );
    });
  });

  describe('deactivate', () => {
    it('deactivates, hides the profile, revokes sessions and audits once', async () => {
      const result = await service.deactivate(userId, {
        confirmation: 'DEACTIVATE',
        reason: 'Taking a break',
      });

      expect(prisma.user.update.mock.calls[0][0].data).toEqual(
        expect.objectContaining({ profileVisible: false, allowEmployerMessages: false }),
      );
      expect(auth.revokeAllForUser).toHaveBeenCalledWith(userId);
      expect(auditPublisher.record).toHaveBeenCalledTimes(1);
      expect(result.deactivatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('is idempotent: a repeat call keeps the original timestamp and writes nothing', async () => {
      const original = new Date('2026-09-01T00:00:00Z');
      prisma.user.findUniqueOrThrow.mockResolvedValue({ deactivatedAt: original });

      const result = await service.deactivate(userId, { confirmation: 'DEACTIVATE' });

      expect(result.deactivatedAt).toBe(original.toISOString());
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(auth.revokeAllForUser).not.toHaveBeenCalled();
      expect(auditPublisher.record).not.toHaveBeenCalled();
    });

    it('rejects a request without the DEACTIVATE confirmation', () => {
      expect(DeactivateAccountRequestSchema.safeParse({ confirmation: 'yes' }).success).toBe(false);
    });
  });

  describe('data requests', () => {
    it('creates an OPEN request and audits it', async () => {
      const result = await service.createDataRequest(userId, {
        type: 'DELETION',
        details: 'Please delete all of my data.',
      });
      expect(result.status).toBe('OPEN');
      expect(prisma.dataSubjectRequest.create).toHaveBeenCalledWith({
        data: { userId, type: 'DELETION', details: 'Please delete all of my data.' },
      });
      expect(auditPublisher.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'data_request.created' }),
      );
    });

    it('rejects a duplicate while one of the same type is still open', async () => {
      prisma.dataSubjectRequest.findFirst.mockResolvedValue({ id: randomUUID() });
      await expect(
        service.createDataRequest(userId, { type: 'CORRECTION', details: 'Fix my name spelling.' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.dataSubjectRequest.create).not.toHaveBeenCalled();
    });

    it('validates that details are long enough', () => {
      expect(
        CreateDataRequestSchema.safeParse({ type: 'DELETION', details: 'short' }).success,
      ).toBe(false);
    });

    it('lists only the caller’s requests, newest first', async () => {
      await service.listDataRequests(userId);
      expect(prisma.dataSubjectRequest.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
