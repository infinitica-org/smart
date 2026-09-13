import { randomUUID } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AuthService, hashPassword, hashRefreshToken } from './auth.service.js';

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    email: 'student@example.com',
    fullName: 'Test Student',
    role: 'STUDENT',
    provider: 'PASSWORD',
    emailVerified: true,
    institutionId: null,
    createdAt: new Date(),
    passwordHash: null as string | null,
    heldAt: null,
    institution: null,
    primaryTrack: null,
    secondaryTrack: null,
    ...overrides,
  };
}

describe('AuthService refresh rotation', () => {
  it('issues a session with a hashed refresh token', async () => {
    const created: unknown[] = [];
    const prisma = {
      refreshToken: {
        create: vi.fn(async ({ data }: { data: unknown }) => {
          created.push(data);
          return data;
        }),
      },
    };
    const jwt = { signAsync: vi.fn(async () => 'access.jwt') };
    const storage = { getSignedDownloadUrl: vi.fn().mockResolvedValue(null) };
    const auth = new AuthService(prisma as never, jwt as never, storage as never);
    const cookies: string[] = [];
    const reply = {
      setCookie: (_name: string, value: string) => {
        cookies.push(value);
      },
    };

    const user = userRow();
    const result = await auth.issueSession(user as never, reply as never);

    expect(result.accessToken).toBe('access.jwt');
    expect(result.tokenType).toBe('Bearer');
    expect(created).toHaveLength(1);
    const row = created[0] as { tokenHash: string; familyId: string; userId: string };
    expect(row.userId).toBe(user.id);
    expect(row.tokenHash).toBe(hashRefreshToken(cookies[0] ?? ''));
    expect(jwt.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sub: user.id, fam: row.familyId }),
    );
  });

  it('rotates refresh and revokes the previous row', async () => {
    const familyId = randomUUID();
    const userId = randomUUID();
    const raw = 'old-refresh-token';
    const existing = {
      id: randomUUID(),
      familyId,
      userId,
      tokenHash: hashRefreshToken(raw),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: userRow({ id: userId }),
    };

    const prisma = {
      refreshToken: {
        findUnique: vi.fn(async () => existing),
        update: vi.fn(async () => existing),
        create: vi.fn(async ({ data }: { data: unknown }) => data),
        updateMany: vi.fn(),
      },
      $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    const jwt = { signAsync: vi.fn(async () => 'rotated.jwt') };
    const storage = { getSignedDownloadUrl: vi.fn().mockResolvedValue(null) };
    const auth = new AuthService(prisma as never, jwt as never, storage as never);
    const request = { cookies: { smart_refresh: raw } };
    const reply = { setCookie: vi.fn(), clearCookie: vi.fn() };

    const result = await auth.refresh(request as never, reply as never);
    expect(result.accessToken).toBe('rotated.jwt');
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(reply.setCookie).toHaveBeenCalled();
  });

  it('revokes the whole family on refresh reuse', async () => {
    const familyId = randomUUID();
    const raw = 'stolen';
    const prisma = {
      refreshToken: {
        findUnique: vi.fn(async () => ({
          id: randomUUID(),
          familyId,
          userId: randomUUID(),
          tokenHash: hashRefreshToken(raw),
          expiresAt: new Date(Date.now() + 60_000),
          revokedAt: new Date(),
          user: userRow(),
        })),
        updateMany: vi.fn(async () => ({ count: 2 })),
      },
    };
    const storage = { getSignedDownloadUrl: vi.fn().mockResolvedValue(null) };
    const auth = new AuthService(
      prisma as never,
      { signAsync: vi.fn() } as never,
      storage as never,
    );
    const reply = { setCookie: vi.fn(), clearCookie: vi.fn() };

    await expect(
      auth.refresh({ cookies: { smart_refresh: raw } } as never, reply as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { familyId, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(reply.clearCookie).toHaveBeenCalled();
  });

  it('blocks tenant login when the institution is on hold', async () => {
    const passwordHash = await hashPassword('password1');
    const prisma = {
      user: {
        findUnique: vi.fn(async () =>
          userRow({
            role: 'STUDENT',
            passwordHash,
            institutionId: randomUUID(),
            institution: { name: 'Held College', heldAt: new Date(), deactivatedAt: null },
          }),
        ),
      },
    };
    const storage = { getSignedDownloadUrl: vi.fn().mockResolvedValue(null) };
    const auth = new AuthService(
      prisma as never,
      { signAsync: vi.fn() } as never,
      storage as never,
    );
    await expect(auth.login('student@example.com', 'password1', {} as never)).rejects.toMatchObject(
      {
        response: {
          error: 'institution_held',
          message: 'This institution is on hold. You cannot use SMART until it is released.',
        },
      },
    );
  });
});

describe('password hashing', () => {
  it('verifies a round-trip hash', async () => {
    const stored = await hashPassword('ChangeMe!Dev');
    const { verifyPassword } = await import('./auth.service.js');
    expect(await verifyPassword('ChangeMe!Dev', stored)).toBe(true);
    expect(await verifyPassword('wrong-password', stored)).toBe(false);
  });
});
