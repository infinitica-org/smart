import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { EmailVerificationService } from './email-verification.service.js';
import { hashEmailVerificationToken } from './email-verification-token.util.js';

describe('EmailVerificationService.sendForUser', () => {
  it('persists a hashed token and enqueues the verification email', async () => {
    const audit = { record: vi.fn() };
    const userId = randomUUID();
    const created: unknown[] = [];
    const prisma = {
      emailVerificationToken: {
        create: vi.fn(async ({ data }: { data: unknown }) => {
          created.push(data);
          return data;
        }),
      },
    };
    const emailQueue = { add: vi.fn() };
    const service = new EmailVerificationService(
      prisma as never,
      emailQueue as never,
      audit as never,
    );

    await service.sendForUser(userId, 'student@example.com', 'Test Student');

    expect(created).toHaveLength(1);
    const row = created[0] as { userId: string; tokenHash: string; expiresAt: Date };
    expect(row.userId).toBe(userId);
    expect(emailQueue.add).toHaveBeenCalledWith(
      'send',
      expect.objectContaining({
        to: 'student@example.com',
        template: 'email-verification',
        data: expect.objectContaining({ fullName: 'Test Student' }),
      }),
    );
  });
});

describe('EmailVerificationService.confirm', () => {
  it('marks the user verified and consumes the token', async () => {
    const audit = { record: vi.fn() };
    const raw = 'raw-token';
    const tokenId = randomUUID();
    const userId = randomUUID();
    const prisma = {
      emailVerificationToken: {
        findUnique: vi.fn(async () => ({
          id: tokenId,
          userId,
          tokenHash: hashEmailVerificationToken(raw),
          expiresAt: new Date(Date.now() + 60_000),
          consumedAt: null,
        })),
        update: vi.fn(),
      },
      user: { update: vi.fn() },
      $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    const service = new EmailVerificationService(
      prisma as never,
      { add: vi.fn() } as never,
      audit as never,
    );

    await service.confirm(raw);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: userId,
        action: 'auth.email_verified',
        resourceId: userId,
      }),
    );
  });

  it('rejects an unknown token with 404', async () => {
    const audit = { record: vi.fn() };
    const prisma = { emailVerificationToken: { findUnique: vi.fn(async () => null) } };
    const service = new EmailVerificationService(
      prisma as never,
      { add: vi.fn() } as never,
      audit as never,
    );

    await expect(service.confirm('bogus')).rejects.toMatchObject({
      response: { statusCode: 404 },
    });
  });

  it('rejects an already-consumed token with 410', async () => {
    const audit = { record: vi.fn() };
    const prisma = {
      emailVerificationToken: {
        findUnique: vi.fn(async () => ({
          id: randomUUID(),
          userId: randomUUID(),
          tokenHash: 'x',
          expiresAt: new Date(Date.now() + 60_000),
          consumedAt: new Date(),
        })),
      },
    };
    const service = new EmailVerificationService(
      prisma as never,
      { add: vi.fn() } as never,
      audit as never,
    );

    await expect(service.confirm('used')).rejects.toMatchObject({
      response: { statusCode: 410 },
    });
  });

  it('rejects an expired token with 410', async () => {
    const audit = { record: vi.fn() };
    const prisma = {
      emailVerificationToken: {
        findUnique: vi.fn(async () => ({
          id: randomUUID(),
          userId: randomUUID(),
          tokenHash: 'x',
          expiresAt: new Date(Date.now() - 60_000),
          consumedAt: null,
        })),
      },
    };
    const service = new EmailVerificationService(
      prisma as never,
      { add: vi.fn() } as never,
      audit as never,
    );

    await expect(service.confirm('expired')).rejects.toMatchObject({
      response: { statusCode: 410 },
    });
  });
});
