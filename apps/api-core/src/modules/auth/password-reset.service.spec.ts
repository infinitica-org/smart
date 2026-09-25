import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { PasswordResetService } from './password-reset.service.js';
import { hashPasswordResetToken } from './password-reset-token.util.js';

describe('PasswordResetService.request', () => {
  it('enqueues a reset email for a known password account', async () => {
    const audit = { record: vi.fn() };
    const userId = randomUUID();
    const created: unknown[] = [];
    const prisma = {
      user: {
        findUnique: vi.fn(async () => ({
          id: userId,
          email: 'student@example.com',
          fullName: 'Test Student',
          passwordHash: 'hashed',
        })),
      },
      passwordResetToken: {
        create: vi.fn(async ({ data }: { data: unknown }) => {
          created.push(data);
          return data;
        }),
      },
    };
    const emailQueue = { add: vi.fn() };
    const service = new PasswordResetService(
      prisma as never,
      {} as never,
      emailQueue as never,
      audit as never,
    );

    await service.request('Student@Example.com');

    expect(created).toHaveLength(1);
    expect(emailQueue.add).toHaveBeenCalledWith(
      'send',
      expect.objectContaining({ to: 'student@example.com', template: 'password-reset' }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: null,
        action: 'auth.password_reset_requested',
        resourceId: userId,
      }),
    );
  });

  it('does not reveal whether the email exists (no user)', async () => {
    const audit = { record: vi.fn() };
    const prisma = { user: { findUnique: vi.fn(async () => null) } };
    const emailQueue = { add: vi.fn() };
    const service = new PasswordResetService(
      prisma as never,
      {} as never,
      emailQueue as never,
      audit as never,
    );

    await expect(service.request('nobody@example.com')).resolves.toBeUndefined();
    expect(emailQueue.add).not.toHaveBeenCalled();
  });

  it('does not reveal whether the email exists (no password set, e.g. invite-only account)', async () => {
    const audit = { record: vi.fn() };
    const prisma = {
      user: { findUnique: vi.fn(async () => ({ id: randomUUID(), passwordHash: null })) },
    };
    const emailQueue = { add: vi.fn() };
    const service = new PasswordResetService(
      prisma as never,
      {} as never,
      emailQueue as never,
      audit as never,
    );

    await expect(service.request('nopassword@example.com')).resolves.toBeUndefined();
    expect(emailQueue.add).not.toHaveBeenCalled();
  });
});

describe('PasswordResetService.confirm', () => {
  it('sets the new password, consumes the token, and revokes all sessions', async () => {
    const audit = { record: vi.fn() };
    const raw = 'raw-reset-token';
    const tokenId = randomUUID();
    const userId = randomUUID();
    const prisma = {
      passwordResetToken: {
        findUnique: vi.fn(async () => ({
          id: tokenId,
          userId,
          tokenHash: hashPasswordResetToken(raw),
          expiresAt: new Date(Date.now() + 60_000),
          consumedAt: null,
        })),
        update: vi.fn(),
      },
      user: { update: vi.fn() },
      $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    const auth = { revokeAllForUser: vi.fn() };
    const service = new PasswordResetService(
      prisma as never,
      auth as never,
      {
        add: vi.fn(),
      } as never,
      audit as never,
    );

    await service.confirm(raw, 'new-password-1');

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(auth.revokeAllForUser).toHaveBeenCalledWith(userId);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: userId,
        action: 'auth.password_reset_completed',
        resourceId: userId,
      }),
    );
  });

  it('rejects an unknown token with 404', async () => {
    const audit = { record: vi.fn() };
    const prisma = { passwordResetToken: { findUnique: vi.fn(async () => null) } };
    const service = new PasswordResetService(
      prisma as never,
      { revokeAllForUser: vi.fn() } as never,
      { add: vi.fn() } as never,
      audit as never,
    );

    await expect(service.confirm('bogus', 'new-password-1')).rejects.toMatchObject({
      response: { statusCode: 404 },
    });
  });

  it('rejects an already-consumed token with 410', async () => {
    const audit = { record: vi.fn() };
    const prisma = {
      passwordResetToken: {
        findUnique: vi.fn(async () => ({
          id: randomUUID(),
          userId: randomUUID(),
          tokenHash: 'x',
          expiresAt: new Date(Date.now() + 60_000),
          consumedAt: new Date(),
        })),
      },
    };
    const service = new PasswordResetService(
      prisma as never,
      { revokeAllForUser: vi.fn() } as never,
      { add: vi.fn() } as never,
      audit as never,
    );

    await expect(service.confirm('used', 'new-password-1')).rejects.toMatchObject({
      response: { statusCode: 410 },
    });
  });

  it('rejects an expired token with 410', async () => {
    const audit = { record: vi.fn() };
    const prisma = {
      passwordResetToken: {
        findUnique: vi.fn(async () => ({
          id: randomUUID(),
          userId: randomUUID(),
          tokenHash: 'x',
          expiresAt: new Date(Date.now() - 60_000),
          consumedAt: null,
        })),
      },
    };
    const service = new PasswordResetService(
      prisma as never,
      { revokeAllForUser: vi.fn() } as never,
      { add: vi.fn() } as never,
      audit as never,
    );

    await expect(service.confirm('expired', 'new-password-1')).rejects.toMatchObject({
      response: { statusCode: 410 },
    });
  });
});
