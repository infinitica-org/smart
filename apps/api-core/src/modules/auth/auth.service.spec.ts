import { randomUUID } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import {
  AuthService,
  buildAccessTokenClaims as _buildAccessTokenClaims,
  hashPassword,
  hashRefreshToken,
  toAuthenticatedUser as _toAuthenticatedUser,
} from './auth.service.js';

function mockAuditPublisher() {
  return { record: vi.fn() };
}

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
    failedLoginAttempts: 0,
    loginLockedUntil: null as Date | null,
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
    const auth = new AuthService(
      prisma as never,
      jwt as never,
      storage as never,
      mockAuditPublisher() as never,
    );
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
    const auth = new AuthService(
      prisma as never,
      jwt as never,
      storage as never,
      mockAuditPublisher() as never,
    );
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
      mockAuditPublisher() as never,
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

  it('audits refresh-token reuse', async () => {
    const familyId = randomUUID();
    const userId = randomUUID();
    const raw = 'stolen';
    const prisma = {
      refreshToken: {
        findUnique: vi.fn(async () => ({
          id: randomUUID(),
          familyId,
          userId,
          tokenHash: hashRefreshToken(raw),
          expiresAt: new Date(Date.now() + 60_000),
          revokedAt: new Date(),
          user: userRow({ id: userId }),
        })),
        updateMany: vi.fn(async () => ({ count: 2 })),
      },
    };
    const auditPublisher = mockAuditPublisher();
    const auth = new AuthService(
      prisma as never,
      { signAsync: vi.fn() } as never,
      { getSignedDownloadUrl: vi.fn() } as never,
      auditPublisher as never,
    );

    await expect(
      auth.refresh(
        { cookies: { smart_refresh: raw } } as never,
        { setCookie: vi.fn(), clearCookie: vi.fn() } as never,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: userId, action: 'auth.refresh_reuse_detected' }),
    );
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
      mockAuditPublisher() as never,
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

describe('AuthService.login lockout (S6-VV-92)', () => {
  it('increments failedLoginAttempts on a wrong password without locking below the threshold', async () => {
    const user = userRow({
      passwordHash: await hashPassword('correct-password'),
      failedLoginAttempts: 2,
    });
    const update = vi.fn();
    const prisma = {
      user: {
        findUnique: vi.fn(async () => user),
        update,
      },
    };
    const auth = new AuthService(
      prisma as never,
      { signAsync: vi.fn() } as never,
      { getSignedDownloadUrl: vi.fn() } as never,
      mockAuditPublisher() as never,
    );

    await expect(
      auth.login('student@example.com', 'wrong-password', {} as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { failedLoginAttempts: 3, loginLockedUntil: undefined },
    });
  });

  it('locks the account once failed attempts reach the threshold, and audits it', async () => {
    const user = userRow({
      passwordHash: await hashPassword('correct-password'),
      failedLoginAttempts: 4,
    });
    const update = vi.fn();
    const prisma = {
      user: {
        findUnique: vi.fn(async () => user),
        update,
      },
    };
    const auditPublisher = mockAuditPublisher();
    const auth = new AuthService(
      prisma as never,
      { signAsync: vi.fn() } as never,
      { getSignedDownloadUrl: vi.fn() } as never,
      auditPublisher as never,
    );

    await expect(
      auth.login('student@example.com', 'wrong-password', {} as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, loginLockedUntil: expect.any(Date) },
    });
    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: user.id, action: 'auth.account_locked' }),
    );
  });

  it('rejects login while locked, even with the correct password', async () => {
    const user = userRow({
      passwordHash: await hashPassword('correct-password'),
      loginLockedUntil: new Date(Date.now() + 60_000),
    });
    const prisma = {
      user: {
        findUnique: vi.fn(async () => user),
        update: vi.fn(),
      },
    };
    const auth = new AuthService(
      prisma as never,
      { signAsync: vi.fn() } as never,
      { getSignedDownloadUrl: vi.fn() } as never,
      mockAuditPublisher() as never,
    );

    await expect(
      auth.login('student@example.com', 'correct-password', {} as never),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ error: 'account_locked' }),
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('clears failedLoginAttempts and any lock on a successful login', async () => {
    const user = userRow({
      passwordHash: await hashPassword('correct-password'),
      failedLoginAttempts: 3,
    });
    const update = vi.fn();
    const prisma = {
      user: { findUnique: vi.fn(async () => user), update },
      refreshToken: { create: vi.fn(async ({ data }: { data: unknown }) => data) },
    };
    const auth = new AuthService(
      prisma as never,
      { signAsync: vi.fn(async () => 'access.jwt') } as never,
      { getSignedDownloadUrl: vi.fn().mockResolvedValue(null) } as never,
      mockAuditPublisher() as never,
    );

    await auth.login('student@example.com', 'correct-password', {
      setCookie: vi.fn(),
    } as never);

    expect(update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, loginLockedUntil: null },
    });
  });
});

describe('AuthService.login failure audit (S6-VV-143)', () => {
  function service(user: unknown) {
    const auditPublisher = mockAuditPublisher();
    const auth = new AuthService(
      { user: { findUnique: vi.fn(async () => user), update: vi.fn() } } as never,
      { signAsync: vi.fn() } as never,
      { getSignedDownloadUrl: vi.fn().mockResolvedValue(null) } as never,
      auditPublisher as never,
    );
    return { auth, auditPublisher };
  }
  const reply = { request: { ip: '203.0.113.7' } } as never;

  it('records an unknown email only as a hash', async () => {
    const { auth, auditPublisher } = service(null);

    await expect(auth.login('Nobody@Example.com', 'x', reply)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    const call = auditPublisher.record.mock.calls[0]?.[0];
    expect(call).toMatchObject({
      actorId: null,
      action: 'auth.login_failed',
      resourceId: null,
      reasonCode: 'unknown_email',
      metadata: { ip: '203.0.113.7', emailSha256: expect.stringMatching(/^[0-9a-f]{64}$/) },
    });
    expect(JSON.stringify(call)).not.toContain('nobody@example.com');
  });

  it('records a wrong password against the targeted account', async () => {
    const user = userRow({ passwordHash: await hashPassword('correct-password') });
    const { auth, auditPublisher } = service(user);

    await expect(auth.login('student@example.com', 'wrong', reply)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: null,
        action: 'auth.login_failed',
        resourceId: user.id,
        reasonCode: 'bad_password',
      }),
    );
  });

  it('records an attempt against a locked account', async () => {
    const user = userRow({
      passwordHash: await hashPassword('correct-password'),
      loginLockedUntil: new Date(Date.now() + 60_000),
    });
    const { auth, auditPublisher } = service(user);

    await expect(auth.login('student@example.com', 'correct-password', reply)).rejects.toThrow();

    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login_failed', reasonCode: 'locked' }),
    );
  });

  it('records a sign-in blocked by a tenant hold', async () => {
    const user = userRow({
      passwordHash: await hashPassword('correct-password'),
      institutionId: randomUUID(),
      institution: { name: 'Held College', heldAt: new Date(), deactivatedAt: null },
    });
    const { auth, auditPublisher } = service(user);

    await expect(auth.login('student@example.com', 'correct-password', reply)).rejects.toThrow();

    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login_failed', reasonCode: 'tenant_blocked' }),
    );
  });

  it('records a sign-in to a deactivated account', async () => {
    const user = userRow({
      passwordHash: await hashPassword('correct-password'),
      deactivatedAt: new Date(),
    });
    const { auth, auditPublisher } = service(user);

    await expect(auth.login('student@example.com', 'correct-password', reply)).rejects.toThrow();

    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login_failed', reasonCode: 'deactivated' }),
    );
  });
});

describe('AuthService.register', () => {
  it('creates a STUDENT user, hashes the password, and issues a session', async () => {
    const institutionId = randomUUID();
    const prisma = {
      user: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) =>
          userRow({ ...data, id: randomUUID() }),
        ),
      },
      institution: {
        findUnique: vi.fn(async () => ({ id: institutionId, deactivatedAt: null, heldAt: null })),
      },
      refreshToken: {
        create: vi.fn(async ({ data }: { data: unknown }) => data),
      },
    };
    const storage = { getSignedDownloadUrl: vi.fn().mockResolvedValue(null) };
    const auth = new AuthService(
      prisma as never,
      { signAsync: vi.fn(async () => 'access.jwt') } as never,
      storage as never,
      mockAuditPublisher() as never,
    );
    const reply = { setCookie: vi.fn() };

    const result = await auth.register(
      {
        email: 'New@Example.com',
        password: 'password1',
        fullName: 'New Student',
        institutionId,
      },
      reply as never,
    );

    expect(result.accessToken).toBe('access.jwt');
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'new@example.com',
          role: 'STUDENT',
          emailVerified: false,
          institutionId,
        }),
      }),
    );
  });

  it('rejects a duplicate email with 409', async () => {
    const prisma = { user: { findUnique: vi.fn(async () => userRow()) } };
    const storage = { getSignedDownloadUrl: vi.fn().mockResolvedValue(null) };
    const auth = new AuthService(
      prisma as never,
      { signAsync: vi.fn() } as never,
      storage as never,
    );

    await expect(
      auth.register(
        {
          email: 'student@example.com',
          password: 'password1',
          fullName: 'X',
          institutionId: randomUUID(),
        },
        {} as never,
      ),
    ).rejects.toMatchObject({ response: { statusCode: 409 } });
  });

  it('rejects an unknown or ineligible institution with 404', async () => {
    const prisma = {
      user: { findUnique: vi.fn(async () => null) },
      institution: { findUnique: vi.fn(async () => null) },
    };
    const storage = { getSignedDownloadUrl: vi.fn().mockResolvedValue(null) };
    const auth = new AuthService(
      prisma as never,
      { signAsync: vi.fn() } as never,
      storage as never,
    );

    await expect(
      auth.register(
        {
          email: 'x@example.com',
          password: 'password1',
          fullName: 'X',
          institutionId: randomUUID(),
        },
        {} as never,
      ),
    ).rejects.toMatchObject({ response: { statusCode: 404 } });
  });
});

describe('AuthService.listSelectableInstitutions', () => {
  it('excludes deactivated and held institutions', async () => {
    const prisma = {
      institution: { findMany: vi.fn(async () => [{ id: randomUUID(), name: 'Active U' }]) },
    };
    const storage = { getSignedDownloadUrl: vi.fn().mockResolvedValue(null) };
    const auth = new AuthService(
      prisma as never,
      { signAsync: vi.fn() } as never,
      storage as never,
    );

    await auth.listSelectableInstitutions();

    expect(prisma.institution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deactivatedAt: null, heldAt: null } }),
    );
  });
});

describe('AuthService session admin (S6-VV-93)', () => {
  function sessionRow(overrides: Record<string, unknown> = {}) {
    return {
      id: randomUUID(),
      familyId: randomUUID(),
      userId: randomUUID(),
      tokenHash: 'hash',
      revokedAt: null as Date | null,
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      user: { email: 'student@example.com', fullName: 'Test Student', role: 'STUDENT' },
      ...overrides,
    };
  }

  it('lists active sessions, excluding revoked/expired ones from the query itself', async () => {
    const row = sessionRow();
    const findMany = vi.fn(async () => [row]);
    const prisma = { refreshToken: { findMany } };
    const auth = new AuthService(
      prisma as never,
      { signAsync: vi.fn() } as never,
      { getSignedDownloadUrl: vi.fn() } as never,
      mockAuditPublisher() as never,
    );

    const result = await auth.listActiveSessions({});

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ revokedAt: null, expiresAt: { gt: expect.any(Date) } }),
      }),
    );
    expect(result).toEqual([
      {
        id: row.id,
        userId: row.userId,
        userEmail: row.user.email,
        userFullName: row.user.fullName,
        userRole: row.user.role,
        familyId: row.familyId,
        createdAt: row.createdAt.toISOString(),
        expiresAt: row.expiresAt.toISOString(),
      },
    ]);
  });

  it('filters the list by userId when given', async () => {
    const userId = randomUUID();
    const findMany = vi.fn(async () => []);
    const prisma = { refreshToken: { findMany } };
    const auth = new AuthService(
      prisma as never,
      { signAsync: vi.fn() } as never,
      { getSignedDownloadUrl: vi.fn() } as never,
      mockAuditPublisher() as never,
    );

    await auth.listActiveSessions({ userId });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId }) }),
    );
  });

  it('revokes the whole session family and audits it', async () => {
    const row = sessionRow();
    const prisma = {
      refreshToken: {
        findUnique: vi.fn(async () => row),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
    };
    const auditPublisher = mockAuditPublisher();
    const auth = new AuthService(
      prisma as never,
      { signAsync: vi.fn() } as never,
      { getSignedDownloadUrl: vi.fn() } as never,
      auditPublisher as never,
    );
    const adminId = randomUUID();

    await auth.revokeSession(row.id, adminId, 'user reported a stolen device');

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { familyId: row.familyId, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(auditPublisher.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: adminId,
        action: 'auth.session_revoked',
        resourceId: row.userId,
        reasonCode: 'user reported a stolen device',
      }),
    );
  });

  it('rejects revoking a session that is already revoked', async () => {
    const row = sessionRow({ revokedAt: new Date() });
    const prisma = {
      refreshToken: { findUnique: vi.fn(async () => row), updateMany: vi.fn() },
    };
    const auth = new AuthService(
      prisma as never,
      { signAsync: vi.fn() } as never,
      { getSignedDownloadUrl: vi.fn() } as never,
      mockAuditPublisher() as never,
    );

    await expect(auth.revokeSession(row.id, randomUUID(), 'reason enough')).rejects.toMatchObject({
      response: { error: 'session_already_inactive' },
    });
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it('rejects revoking a session that does not exist', async () => {
    const prisma = {
      refreshToken: { findUnique: vi.fn(async () => null), updateMany: vi.fn() },
    };
    const auth = new AuthService(
      prisma as never,
      { signAsync: vi.fn() } as never,
      { getSignedDownloadUrl: vi.fn() } as never,
      mockAuditPublisher() as never,
    );

    await expect(
      auth.revokeSession(randomUUID(), randomUUID(), 'reason enough'),
    ).rejects.toMatchObject({ response: { error: 'not_found' } });
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

describe('company portal account status (S6-VV-139)', () => {
  function service(user: unknown) {
    const prisma = { user: { findUnique: vi.fn().mockResolvedValue(user) } };
    const storage = { getSignedDownloadUrl: vi.fn().mockResolvedValue(null) };
    return new AuthService(
      prisma as never,
      {} as never,
      storage as never,
      mockAuditPublisher() as never,
    );
  }

  it('never reports a COMPANY user without a company as approved', async () => {
    const auth = service(userRow({ role: 'COMPANY', email: 'rep@acme.example', company: null }));

    const account = await auth.getCompanyPortalAccount('user-1');

    expect(account.companyVerificationStatus).toBe('PENDING');
  });

  it('reports a company hold when verification was revoked after sign-in', () => {
    const user = _toAuthenticatedUser(
      userRow({
        role: 'COMPANY',
        company: {
          name: 'Acme',
          heldAt: null,
          deactivatedAt: null,
          verificationStatus: 'REJECTED',
        },
      }) as never,
    );

    expect(user.sessionHold).toMatchObject({ code: 'company_held' });
  });
});
