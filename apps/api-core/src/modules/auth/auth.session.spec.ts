import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { attachRefreshCookie, readRefreshCookie } from './auth.cookies.js';
import { AuthService, hashPassword } from './auth.service.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';

describe('refresh cookie helpers', () => {
  it('sets HttpOnly SameSite=Strict cookies and reads them back', () => {
    const cookies: Record<string, unknown> = {};
    const reply = {
      setCookie: (name: string, value: string, options: Record<string, unknown>) => {
        cookies[name] = { value, options };
      },
    };
    attachRefreshCookie(reply as never, 'raw-token');
    const stored = cookies['smart_refresh'] as { value: string; options: Record<string, unknown> };
    expect(stored.value).toBe('raw-token');
    expect(stored.options).toMatchObject({
      httpOnly: true,
      sameSite: 'strict',
      path: '/api/v1/auth',
    });
    expect(readRefreshCookie({ cookies: { smart_refresh: 'raw-token' } })).toBe('raw-token');
    expect(readRefreshCookie({ cookies: {} })).toBeUndefined();
  });
});

describe('AuthService refresh rotation', () => {
  it('issues a 15-minute access token and rotates refresh with reuse detection', async () => {
    const store = createTokenStore();
    const passwordHash = await hashPassword('ChangeMe!Dev');
    const user = makeUser(passwordHash);
    store.users.set(user.email, user);

    const service = new AuthService(
      store.prisma as never,
      {
        signAsync: vi.fn(async (payload: { fam: string }) => `jwt.${payload.fam}`),
      } as never,
      {} as never,
    );

    const login = await service.login('student@smart.local', 'ChangeMe!Dev');
    expect(login.tokens.expiresInSeconds).toBe(900);
    expect(login.tokens.tokenType).toBe('Bearer');
    expect(login.refreshRaw).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(store.tokens).toHaveLength(1);

    const rotated = await service.refresh(login.refreshRaw);
    expect(rotated.refreshRaw).not.toBe(login.refreshRaw);
    expect(store.tokens).toHaveLength(2);
    expect(store.tokens[0]?.revokedAt).toBeInstanceOf(Date);
    expect(store.tokens[1]?.familyId).toBe(store.tokens[0]?.familyId);

    await expect(service.refresh(login.refreshRaw)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(store.tokens.every((row) => row.revokedAt !== null)).toBe(true);
  });

  it('rejects a missing or expired refresh token with 401', async () => {
    const store = createTokenStore();
    const service = new AuthService(
      store.prisma as never,
      {
        signAsync: vi.fn(async () => 'jwt'),
      } as never,
      {} as never,
    );

    await expect(service.refresh(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.refresh('unknown')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

function makeUser(passwordHash: string) {
  return {
    id: USER_ID,
    email: 'student@smart.local',
    fullName: 'Student',
    passwordHash,
    role: 'STUDENT' as const,
    provider: 'PASSWORD' as const,
    emailVerified: true,
    institutionId: '22222222-2222-4222-8222-222222222222',
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    institution: { name: 'SMART Pilot Institute' },
    primaryTrack: { code: 'MBA_FINANCE' },
    secondaryTrack: null,
  };
}

function createTokenStore() {
  const users = new Map<string, ReturnType<typeof makeUser>>();
  const tokens: {
    id: string;
    familyId: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    revokedAt: Date | null;
  }[] = [];

  const prisma = {
    user: {
      findUnique: async ({ where }: { where: { email: string } }) => users.get(where.email) ?? null,
    },
    refreshToken: {
      create: async ({ data }: { data: (typeof tokens)[number] }) => {
        const row = { ...data, id: `rt-${String(tokens.length + 1)}`, revokedAt: null };
        tokens.push(row);
        return row;
      },
      findUnique: async ({ where }: { where: { tokenHash: string } }) => {
        const row = tokens.find((token) => token.tokenHash === where.tokenHash);
        if (!row) return null;
        const user = [...users.values()].find((item) => item.id === row.userId);
        return { ...row, user };
      },
      update: async ({ where, data }: { where: { id: string }; data: { revokedAt: Date } }) => {
        const row = tokens.find((token) => token.id === where.id);
        if (row) row.revokedAt = data.revokedAt;
        return row;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { familyId: string; revokedAt: null };
        data: { revokedAt: Date };
      }) => {
        for (const row of tokens) {
          if (row.familyId === where.familyId && row.revokedAt === null) {
            row.revokedAt = data.revokedAt;
          }
        }
      },
    },
  };

  return { users, tokens, prisma };
}
