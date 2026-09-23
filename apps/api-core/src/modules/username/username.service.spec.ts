import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsernameService } from './username.service.js';

describe('UsernameService (CN-T09)', () => {
  let prisma: any;
  let auditPublisher: any;
  let publicProfileService: any;
  let service: UsernameService;

  const userId = randomUUID();

  beforeEach(() => {
    prisma = {
      user: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          username: null,
          usernameCooldownUntil: null,
          usernameFailedAttempts: 0,
          usernameStatus: null,
          profileVisible: false,
        }),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ ...data })),
      },
      blockedWord: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    auditPublisher = { record: vi.fn().mockResolvedValue(undefined) };
    publicProfileService = {
      evaluateActivationEligibility: vi.fn().mockResolvedValue({
        eligible: true,
        verifiedSkillsCount: 1,
        verifiedCertsCount: 1,
        verifiedWorkExpCount: 0,
      }),
    };
    service = new UsernameService(prisma, auditPublisher, publicProfileService);
  });

  describe('reserve', () => {
    it('reserves a new username, normalizing case, and resets attempt/cooldown state', async () => {
      const result = await service.reserve(userId, { username: 'Ada_Lovelace' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          username: 'Ada_Lovelace',
          usernameNormalized: 'ada_lovelace',
          usernameStatus: 'RESERVED',
          usernameFailedAttempts: 0,
          usernameCooldownUntil: null,
        }),
      });
      expect(auditPublisher.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: userId, action: 'username.reserved' }),
      );
      expect(result.status).toBe('RESERVED');
    });

    it('rejects re-reservation once a username is already set — a claim is permanent', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        username: 'existing_handle',
        usernameCooldownUntil: null,
        usernameFailedAttempts: 0,
        usernameStatus: 'RESERVED',
        profileVisible: false,
      });

      await expect(service.reserve(userId, { username: 'new_handle' })).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('fails clearly, as username_taken, when another user already holds it', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: randomUUID() });
      await expect(service.reserve(userId, { username: 'taken' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('fails clearly, as username_blocked, and never reserves a blocklisted name', async () => {
      prisma.blockedWord.findMany.mockResolvedValue([{ word: 'admin' }]);
      await expect(service.reserve(userId, { username: 'superadmin99' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.user.update).not.toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ usernameStatus: 'RESERVED' }) }),
      );
    });

    it('rejects with 429 and never reveals the attempt count while a cooldown is active', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        usernameCooldownUntil: new Date(Date.now() + 60_000),
        usernameFailedAttempts: 5,
        usernameStatus: null,
        profileVisible: false,
      });

      const call = service.reserve(userId, { username: 'anything' });
      await expect(call).rejects.toBeInstanceOf(HttpException);
      try {
        await call;
      } catch (err) {
        const body = (err as HttpException).getResponse() as Record<string, unknown>;
        expect(body).not.toHaveProperty('failedAttempts');
        expect(body.error).toBe('rate_limit_exceeded');
      }
    });

    it('starts a cooldown once failed attempts cross the threshold, without leaking the count', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        usernameCooldownUntil: null,
        usernameFailedAttempts: 4,
        usernameStatus: null,
        profileVisible: false,
      });
      prisma.user.findUnique.mockResolvedValue({ id: randomUUID() });

      await expect(service.reserve(userId, { username: 'taken' })).rejects.toBeInstanceOf(
        ConflictException,
      );

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          usernameFailedAttempts: 0,
          usernameCooldownUntil: expect.any(Date),
        }),
      });
    });
  });

  describe('getVisibility', () => {
    it('returns the current visibility state including hiddenSections', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        profileVisible: true,
        showInProgressItems: false,
        hiddenSections: ['education', 'projects'],
      });

      const result = await service.getVisibility(userId);

      expect(result).toEqual({
        profileVisible: true,
        showInProgressItems: false,
        hiddenSections: ['education', 'projects'],
      });
    });
  });

  describe('updateVisibility', () => {
    it('persists hiddenSections array when updated', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        usernameStatus: 'ACTIVE',
        profileVisible: true,
      });

      const result = await service.updateVisibility(userId, {
        profileVisible: true,
        hiddenSections: ['skills'],
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          profileVisible: true,
          hiddenSections: ['skills'],
        }),
      });
      expect(result.hiddenSections).toEqual(['skills']);
    });

    it('activates a RESERVED username exactly when visibility is first turned on', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        usernameStatus: 'RESERVED',
        profileVisible: false,
      });

      const result = await service.updateVisibility(userId, { profileVisible: true });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          profileVisible: true,
          usernameStatus: 'ACTIVE',
          usernameActivatedAt: expect.any(Date),
        }),
      });
      expect(result.profileVisible).toBe(true);
    });

    it('does not re-touch username status when visibility is already on', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        usernameStatus: 'ACTIVE',
        profileVisible: true,
      });

      await service.updateVisibility(userId, { profileVisible: true, showInProgressItems: true });

      const call = prisma.user.update.mock.calls[0][0];
      expect(call.data).not.toHaveProperty('usernameActivatedAt');
      expect(call.data.showInProgressItems).toBe(true);
    });

    it('turning visibility off never de-activates an already-active username', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        usernameStatus: 'ACTIVE',
        profileVisible: true,
      });

      await service.updateVisibility(userId, { profileVisible: false });

      const call = prisma.user.update.mock.calls[0][0];
      expect(call.data.usernameStatus).toBeUndefined();
      expect(call.data.profileVisible).toBe(false);
    });

    it('rejects turning visibility on when the activation bar is not met (CN-T07)', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        usernameStatus: 'RESERVED',
        profileVisible: false,
      });
      publicProfileService.evaluateActivationEligibility.mockResolvedValue({
        eligible: false,
        verifiedSkillsCount: 0,
        verifiedCertsCount: 0,
        verifiedWorkExpCount: 0,
      });

      await expect(
        service.updateVisibility(userId, { profileVisible: true }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
