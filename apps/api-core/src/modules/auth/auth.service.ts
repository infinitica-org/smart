import { scrypt as scryptCallback, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthTokenResponse, AuthenticatedUser } from '@smart/contracts';
import { env } from '../../platform/config/env.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { hashRefreshToken } from './auth.cookies.js';

const scrypt = promisify(scryptCallback);
const JWT_ISS = 'smart-api';
const JWT_AUD = 'smart-clients';

const userInclude = {
  institution: true,
  primaryTrack: true,
  secondaryTrack: true,
} as const;

export interface IssuedSession {
  readonly tokens: AuthTokenResponse;
  readonly refreshRaw: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<IssuedSession> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: userInclude,
    });
    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'Email or password is incorrect.',
        statusCode: 401,
      });
    }
    return this.issueSession(user);
  }

  async refresh(rawToken: string | undefined): Promise<IssuedSession> {
    if (!rawToken) {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'Missing refresh cookie.',
        statusCode: 401,
      });
    }

    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(rawToken) },
      include: { user: { include: userInclude } },
    });
    if (!row || row.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException({
        error: 'token_expired',
        message: 'Refresh token is invalid or expired.',
        statusCode: 401,
      });
    }
    if (row.revokedAt) {
      await this.revokeFamily(row.familyId);
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'Refresh token reuse detected. Session revoked.',
        statusCode: 401,
      });
    }

    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });
    return this.issueSession(row.user, row.familyId);
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(rawToken) },
    });
    if (row) await this.revokeFamily(row.familyId);
  }

  private async issueSession(
    user: Parameters<typeof toAuthenticatedUser>[0],
    familyId: string = randomUUID(),
  ): Promise<IssuedSession> {
    const refreshRaw = randomBytes(32).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        familyId,
        userId: user.id,
        tokenHash: hashRefreshToken(refreshRaw),
        expiresAt: new Date(Date.now() + env.REFRESH_TTL_SECONDS * 1000),
      },
    });

    const tracks = [user.primaryTrack?.code, user.secondaryTrack?.code].filter(
      (code): code is string => Boolean(code),
    );
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
      inst: user.institutionId,
      trk: tracks,
      fam: familyId,
      iss: JWT_ISS,
      aud: JWT_AUD,
    });

    return {
      refreshRaw,
      tokens: {
        accessToken,
        tokenType: 'Bearer',
        expiresInSeconds: env.JWT_ACCESS_TTL_SECONDS,
        user: toAuthenticatedUser(user),
      },
    };
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
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

function toAuthenticatedUser(user: {
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
