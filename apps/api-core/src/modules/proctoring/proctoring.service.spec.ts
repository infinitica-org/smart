import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signViolation } from './hmac.js';
import { ProctoringService } from './proctoring.service.js';

const ATTEMPT = '55555555-5555-4555-8555-555555555555';
const USER = '11111111-1111-4111-8111-111111111111';

describe('ProctoringService', () => {
  const redis = {
    status: 'ready',
    connect: vi.fn(),
    get: vi.fn(),
    setex: vi.fn(),
    getdel: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    exists: vi.fn(),
    lpush: vi.fn(),
    lrange: vi.fn(),
    zadd: vi.fn(),
    zrangebyscore: vi.fn(),
    zrem: vi.fn(),
    publish: vi.fn(),
  };
  const prisma = {
    attempt: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
    integrityEvent: { create: vi.fn() },
  };
  const outbox = { enqueueEnvelope: vi.fn() };
  let service: ProctoringService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.attempt.findUnique.mockResolvedValue({
      id: ATTEMPT,
      userId: USER,
      status: 'IN_PROGRESS',
      integrityFlag: 'CLEAN',
    });
    redis.get.mockResolvedValue(null);
    redis.getdel.mockResolvedValue('1');
    redis.incr.mockResolvedValue(1);
    redis.exists.mockResolvedValue(0);
    redis.lrange.mockResolvedValue([]);
    redis.setex.mockResolvedValue('OK');
    service = new ProctoringService(prisma as never, redis as never, outbox as never);
  });

  it('rejects a replayed nonce', async () => {
    redis.getdel.mockResolvedValue(null);
    await expect(
      service.ingest(USER, {
        attemptId: ATTEMPT,
        kind: 'TAB_BLUR',
        occurredAt: new Date().toISOString(),
        nonce: 'n'.repeat(16),
        signature: 's'.repeat(64),
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('does not increment warnings for technical heartbeats', async () => {
    redis.get.mockImplementation(async (key: string) => {
      if (String(key).includes('hmac')) return 'hmac-secret-value-hmac-secret';
      if (String(key).includes('warn')) return '0';
      return null;
    });
    const snap = await service.record(ATTEMPT, 'CLEAN', 'HEARTBEAT_LOST');
    expect(redis.incr).not.toHaveBeenCalled();
    expect(snap.warningCount).toBe(0);
    expect(prisma.integrityEvent.create).toHaveBeenCalled();
  });

  it('accepts a valid HMAC', async () => {
    const nonce = 'n'.repeat(16);
    const secret = 'hmac-secret-value-hmac-secret';
    redis.get.mockImplementation(async (key: string) => {
      if (String(key).includes('hmac')) return secret;
      return '0';
    });
    const signature = signViolation(secret, ATTEMPT, nonce, 'FULLSCREEN_EXIT');
    redis.incr.mockResolvedValue(1);
    const snap = await service.ingest(USER, {
      attemptId: ATTEMPT,
      kind: 'FULLSCREEN_EXIT',
      occurredAt: new Date().toISOString(),
      nonce,
      signature,
    });
    expect(snap.warningCount).toBe(1);
    expect(snap.locked).toBe(false);
  });

  it('locks the attempt at five integrity warnings', async () => {
    redis.incr.mockResolvedValue(5);
    redis.get.mockImplementation(async (key: string) => {
      if (String(key).includes('hmac')) return 'hmac-secret-value-hmac-secret';
      return '4';
    });
    const snap = await service.record(ATTEMPT, 'CLEAN', 'FULLSCREEN_EXIT');
    expect(snap.warningCount).toBe(5);
    expect(snap.locked).toBe(true);
    expect(snap.warningLimit).toBe(5);
    expect(prisma.attempt.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { integrityFlag: 'UNDER_REVIEW' } }),
    );
  });

  it('sets FLAGGED_PROCTOR at three integrity warnings without locking', async () => {
    redis.incr.mockResolvedValue(3);
    const snap = await service.record(ATTEMPT, 'CLEAN', 'OS_KEY');
    expect(snap.warningCount).toBe(3);
    expect(snap.locked).toBe(false);
    expect(prisma.attempt.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { integrityFlag: 'FLAGGED_PROCTOR' } }),
    );
  });

  it('increments for right-click and writes an integrity event', async () => {
    redis.incr.mockResolvedValue(1);
    const snap = await service.record(ATTEMPT, 'CLEAN', 'RIGHT_CLICK');
    expect(snap.warningCount).toBe(1);
    expect(prisma.integrityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          attemptId: ATTEMPT,
          detail: expect.objectContaining({ kind: 'RIGHT_CLICK', classified: 'INTEGRITY' }),
        }),
      }),
    );
  });

  it('does not increment warnings for extra-display technical interruption', async () => {
    const snap = await service.record(ATTEMPT, 'CLEAN', 'TECHNICAL_INTERRUPTION');
    expect(redis.incr).not.toHaveBeenCalled();
    expect(snap.warningCount).toBe(0);
    expect(snap.locked).toBe(false);
    expect(prisma.integrityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          detail: expect.objectContaining({
            kind: 'TECHNICAL_INTERRUPTION',
            classified: 'TECHNICAL',
          }),
        }),
      }),
    );
  });

  it('accepts a skill-verify Redis session without writing Attempt integrity rows', async () => {
    prisma.attempt.findUnique.mockResolvedValue(null);
    redis.get.mockImplementation(async (key: string) => {
      if (String(key).includes('session:skill-verify')) {
        return JSON.stringify({ userId: USER });
      }
      if (String(key).includes('hmac')) return 'hmac-secret-value-hmac-secret';
      return null;
    });
    const snap = await service.snapshot(USER, ATTEMPT);
    expect(snap.attemptId).toBe(ATTEMPT);
    await service.record(ATTEMPT, 'CLEAN', 'TAB_BLUR', undefined, undefined, false);
    expect(prisma.attempt.update).not.toHaveBeenCalled();
    expect(prisma.integrityEvent.create).not.toHaveBeenCalled();
  });
});
