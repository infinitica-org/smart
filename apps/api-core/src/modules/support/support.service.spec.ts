import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupportService } from './support.service.js';

describe('SupportService', () => {
  let service: SupportService;
  let mockPrisma: any;
  let mockRedis: any;
  let mockAudit: any;
  let mockJwt: any;

  const redisStore = new Map<string, { value: string; ttl: number }>();

  beforeEach(() => {
    redisStore.clear();

    mockPrisma = {
      user: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      auditLog: {
        findMany: vi.fn(),
      },
    };

    mockRedis = {
      setex: vi.fn((key: string, ttl: number, val: string) => {
        redisStore.set(key, { value: val, ttl });
        return Promise.resolve('OK');
      }),
      get: vi.fn((key: string) => {
        const item = redisStore.get(key);
        return Promise.resolve(item ? item.value : null);
      }),
      del: vi.fn((key: string) => {
        const existed = redisStore.delete(key);
        return Promise.resolve(existed ? 1 : 0);
      }),
    };

    mockAudit = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    mockJwt = {
      signAsync: vi.fn().mockResolvedValue('mock.delegated.jwt.token'),
    };

    service = new SupportService(mockPrisma, mockRedis, mockAudit, mockJwt);
  });

  describe('lookupUser', () => {
    it('throws BadRequestException for empty query', async () => {
      await expect(service.lookupUser('   ')).rejects.toThrow(BadRequestException);
    });

    it('returns matching users for valid search query', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', email: 'target@example.com', fullName: 'Target User', role: 'STUDENT' },
      ]);

      const result = await service.lookupUser('target@example.com');
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('target@example.com');
      expect(mockPrisma.user.findMany).toHaveBeenCalled();
    });
  });

  describe('createGrant', () => {
    it('rejects invalid ticket ID format', async () => {
      await expect(
        service.createGrant('agent-1', 'SUPPORT_AGENT', {
          targetUserId: '00000000-0000-0000-0000-000000000001',
          ticketId: 'invalid ticket id!',
          rationale: 'Valid rationale here',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects rationale shorter than 8 characters', async () => {
      await expect(
        service.createGrant('agent-1', 'SUPPORT_AGENT', {
          targetUserId: '00000000-0000-0000-0000-000000000001',
          ticketId: 'TICK-1234',
          rationale: 'short',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid TTL (< 60 or > 3600)', async () => {
      await expect(
        service.createGrant('agent-1', 'SUPPORT_AGENT', {
          targetUserId: '00000000-0000-0000-0000-000000000001',
          ticketId: 'TICK-1234',
          rationale: 'Investigating login issues',
          ttlSeconds: 30,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects self-impersonation', async () => {
      await expect(
        service.createGrant('agent-1', 'SUPPORT_AGENT', {
          targetUserId: 'agent-1',
          ticketId: 'TICK-1234',
          rationale: 'Investigating login issues',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if target user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createGrant('agent-1', 'SUPPORT_AGENT', {
          targetUserId: '00000000-0000-0000-0000-000000000001',
          ticketId: 'TICK-1234',
          rationale: 'Investigating login issues',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects impersonation of SUPER_ADMIN accounts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'admin-1',
        role: 'SUPER_ADMIN',
      });

      await expect(
        service.createGrant('agent-1', 'SUPPORT_AGENT', {
          targetUserId: 'admin-1',
          ticketId: 'TICK-1234',
          rationale: 'Investigating admin issue',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates grant successfully, stores in Redis with TTL, and emits audit log without secrets', async () => {
      const targetUserId = '00000000-0000-0000-0000-000000000002';
      mockPrisma.user.findUnique.mockResolvedValue({
        id: targetUserId,
        role: 'STUDENT',
      });

      const res = await service.createGrant('agent-1', 'SUPPORT_AGENT', {
        targetUserId,
        ticketId: 'TICK-9999',
        rationale: 'Customer reported verification error',
        ttlSeconds: 1200,
      });

      expect(res.grantId).toBeDefined();
      expect(res.expiresAt).toBeDefined();

      const redisEntry = redisStore.get(`support_grant:${res.grantId}`);
      expect(redisEntry).toBeDefined();
      expect(redisEntry?.ttl).toBe(1200);

      const parsedGrant = JSON.parse(redisEntry?.value ?? '{}');
      expect(parsedGrant.targetUserId).toBe(targetUserId);
      expect(parsedGrant.ticketId).toBe('TICK-9999');
      expect(parsedGrant.token).toBeUndefined(); // non-leakage check

      expect(mockAudit.record).toHaveBeenCalledWith({
        actorId: 'agent-1',
        action: 'support.access_granted',
        resourceType: 'user',
        resourceId: targetUserId,
        reasonCode: 'TICK-9999',
        metadata: expect.objectContaining({
          grantId: res.grantId,
          ticketId: 'TICK-9999',
          rationale: 'Customer reported verification error',
        }),
      });
    });
  });

  describe('revokeGrant', () => {
    it('revokes active grant and emits audit event', async () => {
      const grantId = '00000000-0000-0000-0000-000000000010';
      redisStore.set(`support_grant:${grantId}`, {
        value: JSON.stringify({
          grantId,
          targetUserId: 'user-2',
          ticketId: 'TICK-100',
        }),
        ttl: 900,
      });

      const res = await service.revokeGrant('agent-1', grantId);
      expect(res.success).toBe(true);
      expect(redisStore.has(`support_grant:${grantId}`)).toBe(false);

      expect(mockAudit.record).toHaveBeenCalledWith({
        actorId: 'agent-1',
        action: 'support.access_revoked',
        resourceType: 'support_grant',
        resourceId: grantId,
        reasonCode: 'TICK-100',
        metadata: expect.objectContaining({ grantId }),
      });
    });

    it('is idempotent when grant is missing/expired', async () => {
      const res = await service.revokeGrant('agent-1', 'non-existent-grant');
      expect(res.success).toBe(true);
    });
  });

  describe('impersonateUser', () => {
    it('throws UnauthorizedException if grant does not exist or expired', async () => {
      await expect(
        service.impersonateUser('agent-1', 'SUPPORT_AGENT', {
          grantId: '00000000-0000-0000-0000-000000000099',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('exchanges grant for delegated JWT, stores session in Redis, and consumes grant', async () => {
      const grantId = '00000000-0000-0000-0000-000000000020';
      const targetUserId = '00000000-0000-0000-0000-000000000002';
      const expiresAt = new Date(Date.now() + 600000).toISOString();

      redisStore.set(`support_grant:${grantId}`, {
        value: JSON.stringify({
          grantId,
          actorId: 'agent-1',
          actorRole: 'SUPPORT_AGENT',
          targetUserId,
          ticketId: 'TICK-5555',
          rationale: 'Reviewing dashboard bug',
          expiresAt,
        }),
        ttl: 600,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: targetUserId,
        role: 'STUDENT',
        institutionId: 'inst-1',
        companyId: null,
      });

      const res = await service.impersonateUser('agent-1', 'SUPPORT_AGENT', { grantId });

      expect(res.sessionId).toBeDefined();
      expect(res.delegatedAccessToken).toBe('mock.delegated.jwt.token');
      expect(res.targetUserId).toBe(targetUserId);

      // Verify grant was consumed
      expect(redisStore.has(`support_grant:${grantId}`)).toBe(false);

      // Verify session stored in Redis
      expect(redisStore.has(`support_session:${res.sessionId}`)).toBe(true);

      // Verify JWT claims
      expect(mockJwt.signAsync).toHaveBeenCalledWith({
        sub: targetUserId,
        role: 'STUDENT',
        inst: 'inst-1',
        companyId: undefined,
        isDelegated: true,
        actorId: 'agent-1',
        actorRole: 'SUPPORT_AGENT',
        ticketId: 'TICK-5555',
        supportSessionId: res.sessionId,
      });

      // Audit event logged
      expect(mockAudit.record).toHaveBeenCalledWith({
        actorId: 'agent-1',
        action: 'support.session_started',
        resourceType: 'user',
        resourceId: targetUserId,
        reasonCode: 'TICK-5555',
        metadata: expect.objectContaining({
          sessionId: res.sessionId,
          grantId,
          ticketId: 'TICK-5555',
        }),
      });
    });
  });

  describe('endSession', () => {
    it('deletes Redis session key and records audit event', async () => {
      const sessionId = '00000000-0000-0000-0000-000000000030';
      redisStore.set(`support_session:${sessionId}`, {
        value: JSON.stringify({
          sessionId,
          grantId: 'grant-1',
          actorId: 'agent-1',
          actorRole: 'SUPPORT_AGENT',
          targetUserId: 'user-2',
          ticketId: 'TICK-7777',
        }),
        ttl: 600,
      });

      const requestUser = {
        sub: 'user-2',
        role: 'STUDENT',
        inst: 'inst-1',
        isDelegated: true,
        actorId: 'agent-1',
        actorRole: 'SUPPORT_AGENT',
        ticketId: 'TICK-7777',
        supportSessionId: sessionId,
      };

      const res = await service.endSession(requestUser as any);
      expect(res.success).toBe(true);
      expect(redisStore.has(`support_session:${sessionId}`)).toBe(false);

      expect(mockAudit.record).toHaveBeenCalledWith({
        actorId: 'agent-1',
        action: 'support.session_ended',
        resourceType: 'support_session',
        resourceId: sessionId,
        reasonCode: 'TICK-7777',
        metadata: expect.objectContaining({
          sessionId,
          targetUserId: 'user-2',
          actorId: 'agent-1',
        }),
      });
    });
  });

  describe('getDiagnosticSummary', () => {
    it('throws NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getDiagnosticSummary('unknown-user')).rejects.toThrow(NotFoundException);
    });

    it('returns structured diagnostic status for user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'student@example.com',
        fullName: 'Jane Student',
        role: 'STUDENT',
        deactivatedAt: null,
        heldAt: null,
        institutionId: 'inst-1',
        institution: { heldAt: null, deactivatedAt: null },
        onboardingCompleted: true,
        primaryTrackId: 'track-backend',
        skillClaims: [{ status: 'VERIFIED' }, { status: 'DECLARED' }],
      });

      const res = await service.getDiagnosticSummary('user-1');

      expect(res.userId).toBe('user-1');
      expect(res.accountState).toBe('ACTIVE');
      expect(res.verifiedSkillCount).toBe(1);
      expect(res.enrolledTracks).toEqual(['track-backend']);
    });
  });

  describe('getSupportHistory', () => {
    it('queries AuditLog table and formats DTO array', async () => {
      const now = new Date();
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: 'audit-1',
          actorId: 'agent-1',
          actor: { email: 'agent@smart.edu', role: 'SUPPORT_AGENT' },
          action: 'support.access_granted',
          resourceType: 'user',
          resourceId: 'user-1',
          reasonCode: 'TICK-1234',
          metadata: { grantId: 'grant-1' },
          createdAt: now,
        },
      ]);

      const res = await service.getSupportHistory({ actorId: 'agent-1' });

      expect(res.items).toHaveLength(1);
      expect(res.items[0].auditLogId).toBe('audit-1');
      expect(res.items[0].actorEmail).toBe('agent@smart.edu');
      expect(res.items[0].action).toBe('support.access_granted');
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ actorId: 'agent-1' }),
        }),
      );
    });
  });
});
