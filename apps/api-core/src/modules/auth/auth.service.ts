import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  CompanyPortalAccountSchema,
  type AuthTokenResponse,
  type AuthenticatedUser,
  type CompanyPortalAccount,
} from '@smart/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../../platform/config/env.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { StorageService } from '../../platform/storage/storage.service.js';
import { resolveSessionHold } from '../../common/session-hold.js';
import { toAuthenticatedUserWithPhoto } from '../users/profile-photo.util.js';
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
  heldAt: Date | null;
  onboardingCompleted?: boolean;
  profilePhotoObjectKey?: string | null;
  institution: {
    name: string;
    heldAt: Date | null;
    deactivatedAt: Date | null;
  } | null;
  companyId?: string | null;
  company?: {
    name: string;
    heldAt: Date | null;
    deactivatedAt: Date | null;
    verificationStatus?: string;
  } | null;
  primaryTrack: { code: string } | null;
  secondaryTrack: { code: string } | null;
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  async login(email: string, password: string, reply: FastifyReply): Promise<AuthTokenResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { institution: true, company: true, primaryTrack: true, secondaryTrack: true },
    });
    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'Email or password is incorrect.',
        statusCode: 401,
      });
    }
    assertTenantLoginAllowed(user);

    return this.issueSession(user, reply);
  }

  /** Issues tokens without re-checking password; caller must enforce tenant gates when appropriate. */
  async issueSessionAfterInviteAccept(
    user: UserWithAuthIncludes,
    reply: FastifyReply,
  ): Promise<AuthTokenResponse> {
    assertTenantLoginAllowed(user);
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
        user: {
          include: { institution: true, company: true, primaryTrack: true, secondaryTrack: true },
        },
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

    assertTenantLoginAllowed(existing.user);

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

  async getCompanyPortalAccount(userId: string): Promise<CompanyPortalAccount> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { institution: true, company: true, primaryTrack: true, secondaryTrack: true },
    });
    if (!user) {
      throw unauthorized('User not found.');
    }
    if (user.role !== 'COMPANY' || !user.companyId || !user.company) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'You do not have permission to perform this action.',
        statusCode: 403,
      });
    }
    const base = await toAuthenticatedUserWithPhoto(this.storage, user);
    return CompanyPortalAccountSchema.parse({
      ...base,
      companyVerificationStatus: user.company.verificationStatus,
      companyWebsite: user.company.website,
      companyIndustry: user.company.taxonomyDomain,
      companyLocation: user.company.location,
    });
  }

  private async toTokenResponse(
    user: UserWithAuthIncludes,
    familyId: string,
  ): Promise<AuthTokenResponse> {
    const accessToken = await this.jwt.signAsync(buildAccessTokenClaims(user, familyId));

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresInSeconds: env.JWT_ACCESS_TTL_SECONDS,
      user: await toAuthenticatedUserWithPhoto(this.storage, user),
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
  const cookies = (request as FastifyRequest & { cookies?: Record<string, string | undefined> })
    .cookies;
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

function assertTenantLoginAllowed(user: {
  role: AuthenticatedUser['role'];
  heldAt: Date | null;
  institution: { heldAt: Date | null; deactivatedAt: Date | null } | null;
  company?: {
    heldAt: Date | null;
    deactivatedAt: Date | null;
    verificationStatus?: string;
  } | null;
}): void {
  if (user.role === 'COMPANY') {
    if (!user.company || user.company.verificationStatus !== 'APPROVED') {
      throw unauthorized(
        'Company verification is not approved. You cannot sign in to the company portal yet.',
      );
    }
  }
  const hold = resolveSessionHold(user);
  if (!hold) return;
  throw new UnauthorizedException({
    error: hold.code,
    message: hold.message,
    statusCode: 401,
  });
}

export function buildAccessTokenClaims(
  user: Pick<
    UserWithAuthIncludes,
    'id' | 'role' | 'institutionId' | 'companyId' | 'primaryTrack' | 'secondaryTrack'
  >,
  familyId: string,
): Record<string, unknown> {
  const claims: Record<string, unknown> = {
    sub: user.id,
    role: user.role,
    inst: user.institutionId,
    fam: familyId,
    trk: [user.primaryTrack?.code, user.secondaryTrack?.code].filter(Boolean),
  };
  if (user.role === 'COMPANY' && user.companyId) {
    claims.cmp = user.companyId;
  }
  return claims;
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

/** Prisma returns `cgpa`/`sscPercentage`/`hscPercentage` as `Decimal`; duck-type rather than import generated internals. */
type Decimalish = { toNumber?: () => number } | number;

function nullableDecimal(value: Decimalish | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? value : (value.toNumber?.() ?? null);
}

export function toAuthenticatedUser(user: {
  id: string;
  email: string;
  fullName: string;
  role: AuthenticatedUser['role'];
  provider: AuthenticatedUser['provider'];
  emailVerified: boolean;
  institutionId: string | null;
  companyId?: string | null;
  createdAt: Date;
  heldAt?: Date | null;
  onboardingCompleted?: boolean;
  institution: { name: string; heldAt?: Date | null; deactivatedAt?: Date | null } | null;
  company?: {
    name?: string;
    heldAt?: Date | null;
    deactivatedAt?: Date | null;
    verificationStatus?: string;
  } | null;
  primaryTrack: { code: string } | null;
  secondaryTrack: { code: string } | null;
  profilePhotoObjectKey?: string | null;
  cgpa?: Decimalish | null;
  sscPercentage?: Decimalish | null;
  hscPercentage?: Decimalish | null;
}): AuthenticatedUser {
  const hold = resolveSessionHold({
    role: user.role,
    heldAt: user.heldAt ?? null,
    institution: user.institution
      ? {
          heldAt: user.institution.heldAt ?? null,
          deactivatedAt: user.institution.deactivatedAt ?? null,
        }
      : null,
    company: user.company
      ? {
          heldAt: user.company.heldAt ?? null,
          deactivatedAt: user.company.deactivatedAt ?? null,
        }
      : null,
  });
  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    institutionId: user.institutionId,
    institutionName: user.institution?.name ?? null,
    companyId: user.companyId ?? null,
    companyName: user.company?.name ?? null,
    primaryTrack: (user.primaryTrack?.code as AuthenticatedUser['primaryTrack']) ?? null,
    secondaryTrack: (user.secondaryTrack?.code as AuthenticatedUser['secondaryTrack']) ?? null,
    provider: user.provider,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
    // Non-students skip candidate onboarding; students require the server flag.
    onboardingCompleted: user.role === 'STUDENT' ? Boolean(user.onboardingCompleted) : true,
    profilePhotoUrl: null,
    cgpa: nullableDecimal(user.cgpa),
    sscPercentage: nullableDecimal(user.sscPercentage),
    hscPercentage: nullableDecimal(user.hscPercentage),
    sessionHold: hold,
  };
}
