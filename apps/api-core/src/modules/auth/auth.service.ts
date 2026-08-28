import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthTokenResponse, AuthenticatedUser } from '@smart/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../../platform/config/env.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { clearRefreshCookie, setRefreshCookie } from './refresh-cookie.js';

const scrypt = promisify(scryptCallback);

export type UserWithAuthIncludes = {
  id: string;
  email: string;
  fullName: string;
  role: AuthenticatedUser['role'];
  provider: AuthenticatedUser['provider'];
  emailVerified: boolean;
  institutionId: string | null;
  createdAt: Date;
  passwordHash: string | null;
  institution: { name: string } | null;
  primaryTrack: { code: string } | null;
  secondaryTrack: { code: string } | null;
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string, reply: FastifyReply): Promise<AuthTokenResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { institution: true, primaryTrack: true, secondaryTrack: true },
    });
    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'Email or password is incorrect.',
        statusCode: 401,
      });
    }

    return this.issueSession(user, reply);
  }

  async issueSession(user: UserWithAuthIncludes, reply: FastifyReply): Promise<AuthTokenResponse> {
    const familyId = randomUUID();
    const rawRefresh = createRefreshToken();
    const expiresAt = new Date(Date.now() + env.REFRESH_TTL_SECONDS * 1000);

    await this.prisma.refreshToken.create({
      data: {
        familyId,
        userId: user.id,
        tokenHash: hashRefreshToken(rawRefresh),
        expiresAt,
      },
    });

    setRefreshCookie(reply, rawRefresh);
    return this.toTokenResponse(user, familyId);
  }

  async refresh(request: FastifyRequest, reply: FastifyReply): Promise<AuthTokenResponse> {
    const raw = readRefreshCookie(request);
    if (!raw) {
      throw unauthorized('Refresh token is missing.');
    }

    const tokenHash = hashRefreshToken(raw);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: { include: { institution: true, primaryTrack: true, secondaryTrack: true } },
      },
    });

    if (!existing) {
      throw unauthorized('Refresh token is invalid.');
    }

    if (existing.revokedAt) {
      await this.revokeFamily(existing.familyId);
      clearRefreshCookie(reply);
      throw unauthorized('Refresh token reuse detected. Sign in again.');
    }

    if (existing.expiresAt < new Date()) {
      await this.prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      });
      clearRefreshCookie(reply);
      throw unauthorized('Refresh token has expired.');
    }

    const nextRaw = createRefreshToken();
    const expiresAt = new Date(Date.now() + env.REFRESH_TTL_SECONDS * 1000);

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      }),
      this.prisma.refreshToken.create({
        data: {
          familyId: existing.familyId,
          userId: existing.userId,
          tokenHash: hashRefreshToken(nextRaw),
          expiresAt,
        },
      }),
    ]);

    setRefreshCookie(reply, nextRaw);
    return this.toTokenResponse(existing.user, existing.familyId);
  }

  async logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const raw = readRefreshCookie(request);
    if (raw) {
      const existing = await this.prisma.refreshToken.findUnique({
        where: { tokenHash: hashRefreshToken(raw) },
      });
      if (existing) {
        await this.revokeFamily(existing.familyId);
      }
    }
    clearRefreshCookie(reply);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async toTokenResponse(
    user: UserWithAuthIncludes,
    familyId: string,
  ): Promise<AuthTokenResponse> {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
      inst: user.institutionId,
      fam: familyId,
      trk: [user.primaryTrack?.code, user.secondaryTrack?.code].filter(Boolean),
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresInSeconds: env.JWT_ACCESS_TTL_SECONDS,
      user: toAuthenticatedUser(user),
    };
  }
}

export function createRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function readRefreshCookie(request: FastifyRequest): string | undefined {
  const cookies = request.cookies as Record<string, string | undefined> | undefined;
  const value = cookies?.[env.REFRESH_COOKIE_NAME];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function unauthorized(message: string): UnauthorizedException {
  return new UnauthorizedException({
    error: 'unauthorized',
    message,
    statusCode: 401,
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const derived = (await scrypt(password, Buffer.from(saltHex, 'hex'), 64)) as Buffer;
  const expected = Buffer.from(hashHex, 'hex');
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export function toAuthenticatedUser(user: {
  id: string;
  email: string;
  fullName: string;
  role: AuthenticatedUser['role'];
  provider: AuthenticatedUser['provider'];
  emailVerified: boolean;
  institutionId: string | null;
  createdAt: Date;
  institution: { name: string } | null;
  primaryTrack: { code: string } | null;
  secondaryTrack: { code: string } | null;
}): AuthenticatedUser {
  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    institutionId: user.institutionId,
    institutionName: user.institution?.name ?? null,
    primaryTrack: (user.primaryTrack?.code as AuthenticatedUser['primaryTrack']) ?? null,
    secondaryTrack: (user.secondaryTrack?.code as AuthenticatedUser['secondaryTrack']) ?? null,
    provider: user.provider,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
  };
}
