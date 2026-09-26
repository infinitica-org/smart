import { randomUUID } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import {
  CreateDataRequestSchema,
  DeactivateAccountRequestSchema,
  UpdatePersonalInfoRequestSchema,
} from '@smart/contracts';
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
          discoverableToEmployers: true,
          deactivatedAt: null,
          onboardingDetails: {
            firstName: 'Ada',
            lastName: 'Lovelace',
            gender: 'Female',
            dateOfBirth: '2003-12-10',
            phoneCountryCode: '+91',
            phoneNumber: '9876543210',
            about: 'Keep me',
          },
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

  describe('personal info', () => {
    it('reads names, gender, date of birth and a read-only phone from the onboarding snapshot', async () => {
      const info = await service.getPersonalInfo(userId);
      expect(info).toEqual({
        firstName: 'Ada',
        lastName: 'Lovelace',
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        gender: 'Female',
        dateOfBirth: '2003-12-10',
        phone: '+91 9876543210',
        graduationYear: 2027,
      });
    });

    it('falls back to splitting the full name before onboarding is complete', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        fullName: 'Grace Brewster Hopper',
        email: 'g@example.com',
        graduationYear: null,
        onboardingDetails: null,
      });
      const info = await service.getPersonalInfo(userId);
      expect(info.firstName).toBe('Grace');
      expect(info.lastName).toBe('Brewster Hopper');
      expect(info.phone).toBeNull();
    });

    it('updates the column and the onboarding snapshot, preserving unrelated fields and the phone', async () => {
      await service.updatePersonalInfo(userId, {
        firstName: 'Augusta',
        lastName: 'King',
        gender: 'Female',
        dateOfBirth: '2003-12-11',
        graduationYear: 2028,
      });

      const data = prisma.user.update.mock.calls[0][0].data;
      expect(data.fullName).toBe('Augusta King');
      expect(data.graduationYear).toBe(2028);
      expect(data.onboardingDetails).toEqual(
        expect.objectContaining({
          firstName: 'Augusta',
          lastName: 'King',
          dateOfBirth: '2003-12-11',
          phoneNumber: '9876543210',
          about: 'Keep me',
        }),
      );
    });

    it('never creates an onboarding snapshot for a student who has not onboarded', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        fullName: 'Grace Hopper',
        email: 'g@example.com',
        graduationYear: null,
        onboardingDetails: null,
      });

      await service.updatePersonalInfo(userId, { firstName: 'Grace', lastName: 'H' });

      const data = prisma.user.update.mock.calls[0][0].data;
      expect(data).toEqual({ fullName: 'Grace H' });
    });

    it('audits prior and new values but leaves contact details out', async () => {
      await service.updatePersonalInfo(userId, { firstName: 'Augusta', lastName: 'King' });

      const call = auditPublisher.record.mock.calls[0][0];
      expect(call.action).toBe('personal_info.updated');
      expect(call.metadata.prior.firstName).toBe('Ada');
      expect(JSON.stringify(call.metadata)).not.toContain('9876543210');
      expect(JSON.stringify(call.metadata)).not.toContain('ada@example.com');
    });

    it('rejects invalid names, future birth dates and malformed dates', () => {
      const ok = { firstName: 'Ada', lastName: 'L' };
      expect(UpdatePersonalInfoRequestSchema.safeParse({ ...ok, firstName: ' ' }).success).toBe(
        false,
      );
      expect(
        UpdatePersonalInfoRequestSchema.safeParse({ ...ok, lastName: 'x'.repeat(51) }).success,
      ).toBe(false);
      expect(
        UpdatePersonalInfoRequestSchema.safeParse({ ...ok, dateOfBirth: '2999-01-01' }).success,
      ).toBe(false);
      expect(
        UpdatePersonalInfoRequestSchema.safeParse({ ...ok, dateOfBirth: '10/12/2003' }).success,
      ).toBe(false);
      expect(
        UpdatePersonalInfoRequestSchema.safeParse({ ...ok, dateOfBirth: '2003-12-10' }).success,
      ).toBe(true);
    });
  });

  describe('updateMessagingPreference', () => {
    it('persists the switch and audits it', async () => {
      const result = await service.updateMessagingPreference(userId, {
        allowEmployerMessages: false,
      });
      expect(result).toEqual({ allowEmployerMessages: false });
      expect(auditPublisher.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'messaging_preference.updated',
          metadata: {
            prior: { allowEmployerMessages: true },
            next: { allowEmployerMessages: false },
          },
        }),
      );
    });

    it('is idempotent: repeating the current choice writes and audits nothing', async () => {
      const result = await service.updateMessagingPreference(userId, {
        allowEmployerMessages: true,
      });
      expect(result).toEqual({ allowEmployerMessages: true });
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(auditPublisher.record).not.toHaveBeenCalled();
    });
  });

  describe('updateDiscoverability (S6-VV-113)', () => {
    it('opts out of employer discovery and audits prior and next', async () => {
      const result = await service.updateDiscoverability(userId, {
        discoverableToEmployers: false,
      });
      expect(result).toEqual({ discoverableToEmployers: false });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { discoverableToEmployers: false } }),
      );
      expect(auditPublisher.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: userId,
          action: 'account.discoverability_changed',
          metadata: {
            prior: { discoverableToEmployers: true },
            next: { discoverableToEmployers: false },
          },
        }),
      );
    });

    it('is idempotent: repeating the current choice writes and audits nothing', async () => {
      const result = await service.updateDiscoverability(userId, {
        discoverableToEmployers: true,
      });
      expect(result).toEqual({ discoverableToEmployers: true });
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(auditPublisher.record).not.toHaveBeenCalled();
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
    it('queues an export without asking for details (S6-VV-115)', async () => {
      const exportQueue = { add: vi.fn().mockResolvedValue(undefined) };
      service = new AccountService(prisma, auditPublisher, auth, exportQueue as never);

      const result = await service.createDataRequest(userId, { type: 'EXPORT', details: '' });

      expect(result.type).toBe('EXPORT');
      expect(exportQueue.add).toHaveBeenCalledWith(
        'build',
        { requestId: result.id },
        { jobId: result.id },
      );
    });

    it('refuses a second export within a day of the last one (S6-VV-115)', async () => {
      prisma.dataSubjectRequest.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'recent', status: 'COMPLETED' });

      await expect(
        service.createDataRequest(userId, { type: 'EXPORT', details: '' }),
      ).rejects.toMatchObject({ response: { error: 'export_rate_limited' }, status: 429 });
      expect(prisma.dataSubjectRequest.create).not.toHaveBeenCalled();
    });

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
