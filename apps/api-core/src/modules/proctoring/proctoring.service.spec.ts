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
});
