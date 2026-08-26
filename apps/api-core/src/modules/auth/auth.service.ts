import { scrypt as scryptCallback, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthTokenResponse, AuthenticatedUser } from '@smart/contracts';
import { env } from '../../platform/config/env.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

const scrypt = promisify(scryptCallback);

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<AuthTokenResponse> {
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

    const dto = toAuthenticatedUser(user);
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
      inst: user.institutionId,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresInSeconds: env.JWT_ACCESS_TTL_SECONDS,
      user: dto,
    };
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
