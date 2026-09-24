import { randomUUID } from 'node:crypto';
import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';

describe('AuthService.registerStudent', () => {
  it('registers a student with a valid university email domain and issues session', async () => {
    const institutionId = randomUUID();
    const mockInstitution = { id: institutionId, domain: 'psgtech.ac.in', name: 'PSG Tech' };

    const createdUsers: any[] = [];
    const prisma = {
      institution: {
        findMany: vi.fn(async () => [mockInstitution]),
      },
      user: {
        create: vi.fn(async ({ data }: { data: any }) => {
          const user = {
            id: randomUUID(),
            ...data,
            createdAt: new Date(),
            institution: mockInstitution,
            company: null,
            primaryTrack: null,
            secondaryTrack: null,
          };
          createdUsers.push(user);
          return user;
        }),
      },
      refreshToken: {
        create: vi.fn(async ({ data }: { data: any }) => data),
      },
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(prisma)),
    };

    const jwt = { signAsync: vi.fn(async () => 'access.token.jwt') };
    const storage = { getSignedDownloadUrl: vi.fn().mockResolvedValue(null) };
    const auth = new AuthService(prisma as any, jwt as any, storage as any);
    const reply = { setCookie: vi.fn() };

    const result = await auth.registerStudent(
      {
        fullName: 'Jane Doe',
        email: 'jane@psgtech.ac.in',
        password: 'Password123!',
      },
      reply as any,
    );

    expect(result.accessToken).toBe('access.token.jwt');
    expect(createdUsers).toHaveLength(1);
    expect(createdUsers[0]).toMatchObject({
      fullName: 'Jane Doe',
      email: 'jane@psgtech.ac.in',
      role: 'STUDENT',
      provider: 'PASSWORD',
      emailVerified: false,
      institutionId,
      onboardingCompleted: false,
    });
  });

  it('rejects registration with a personal email domain (e.g. gmail.com)', async () => {
    const prisma = {
      institution: { findMany: vi.fn(async () => []) },
    };
    const auth = new AuthService(prisma as any, {} as any, {} as any);

    await expect(
      auth.registerStudent(
        {
          fullName: 'Jane Personal',
          email: 'jane@gmail.com',
          password: 'Password123!',
        },
        {} as any,
      ),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('rejects registration when the university domain is not registered on SMART', async () => {
    const prisma = {
      institution: { findMany: vi.fn(async () => [{ id: randomUUID(), domain: 'psgtech.ac.in' }]) },
    };
    const auth = new AuthService(prisma as any, {} as any, {} as any);

    await expect(
      auth.registerStudent(
        {
          fullName: 'Student Unregistered',
          email: 'student@unknown-univ.edu',
          password: 'Password123!',
        },
        {} as any,
      ),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('translates P2002 unique email index constraint to 409 ConflictException', async () => {
    const mockInstitution = { id: randomUUID(), domain: 'psgtech.ac.in' };
    const p2002Error = { code: 'P2002', clientVersion: '5.0.0' };

    const prisma = {
      institution: {
        findMany: vi.fn(async () => [mockInstitution]),
      },
      user: {
        create: vi.fn(async () => {
          throw p2002Error;
        }),
      },
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(prisma)),
    };
    const auth = new AuthService(prisma as any, {} as any, {} as any);

    await expect(
      auth.registerStudent(
        {
          fullName: 'Duplicate User',
          email: 'duplicate@psgtech.ac.in',
          password: 'Password123!',
        },
        {} as any,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('normalizes email case/whitespace so a differently-cased duplicate still hits the unique constraint', async () => {
    const mockInstitution = { id: randomUUID(), domain: 'psgtech.ac.in' };
    const p2002Error = { code: 'P2002', clientVersion: '5.0.0' };
    const createCalls: any[] = [];

    const prisma = {
      institution: { findMany: vi.fn(async () => [mockInstitution]) },
      user: {
        create: vi.fn(async ({ data }: { data: any }) => {
          createCalls.push(data);
          throw p2002Error;
        }),
      },
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(prisma)),
    };
    const auth = new AuthService(prisma as any, {} as any, {} as any);

    await expect(
      auth.registerStudent(
        {
          fullName: 'Jane Doe',
          email: '  Jane@PSGTech.ac.in  ',
          password: 'Password123!',
        },
        {} as any,
      ),
    ).rejects.toThrow(ConflictException);

    expect(createCalls[0].email).toBe('jane@psgtech.ac.in');
  });

  it('handles two concurrent registrations for the same email — the loser gets 409, no crash', async () => {
    const mockInstitution = { id: randomUUID(), domain: 'psgtech.ac.in' };
    let created = false;

    const prisma = {
      institution: { findMany: vi.fn(async () => [mockInstitution]) },
      user: {
        create: vi.fn(async ({ data }: { data: any }) => {
          if (created) {
            throw { code: 'P2002', clientVersion: '5.0.0' };
          }
          created = true;
          return {
            id: randomUUID(),
            ...data,
            createdAt: new Date(),
            institution: mockInstitution,
            company: null,
            primaryTrack: null,
            secondaryTrack: null,
          };
        }),
      },
      refreshToken: { create: vi.fn(async ({ data }: { data: any }) => data) },
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(prisma)),
    };
    const jwt = { signAsync: vi.fn(async () => 'access.token.jwt') };
    const storage = { getSignedDownloadUrl: vi.fn().mockResolvedValue(null) };
    const auth = new AuthService(prisma as any, jwt as any, storage as any);

    const registerPayload = {
      fullName: 'Concurrent Student',
      email: 'concurrent@psgtech.ac.in',
      password: 'Password123!',
    };

    const [first, second] = await Promise.allSettled([
      auth.registerStudent(registerPayload, { setCookie: vi.fn() } as any),
      auth.registerStudent(registerPayload, { setCookie: vi.fn() } as any),
    ]);

    const outcomes = [first, second];
    expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = outcomes.find((r) => r.status === 'rejected');
    expect(rejected).toBeDefined();
    if (rejected?.status === 'rejected') {
      expect(rejected.reason).toBeInstanceOf(ConflictException);
    }
  });

  it('retrying registration after a conflict keeps returning a clean 409, not a crash', async () => {
    const mockInstitution = { id: randomUUID(), domain: 'psgtech.ac.in' };
    const prisma = {
      institution: { findMany: vi.fn(async () => [mockInstitution]) },
      user: {
        create: vi.fn(async () => {
          throw { code: 'P2002', clientVersion: '5.0.0' };
        }),
      },
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(prisma)),
    };
    const auth = new AuthService(prisma as any, {} as any, {} as any);
    const payload = {
      fullName: 'Retry Student',
      email: 'retry@psgtech.ac.in',
      password: 'Password123!',
    };

    await expect(auth.registerStudent(payload, {} as any)).rejects.toThrow(ConflictException);
    // Retrying the identical request must not throw anything other than the same clean 409 —
    // no duplicate row, no unhandled exception, no partial account state.
    await expect(auth.registerStudent(payload, {} as any)).rejects.toThrow(ConflictException);
  });
});
