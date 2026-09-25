import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  EMAIL_NOT_VERIFIED_ERROR,
  CompanyPortalAccountSchema,
  isDisallowedEndorserEmailDomain,
  type ActiveSessionDto,
  type AuthTokenResponse,
  type AuthenticatedUser,
  type CompanyPortalAccount,
  type ListActiveSessionsQuery,
  type RegisterRequest,
  type RegisterStudentRequest,
  type SelectableInstitutionDto,
} from '@smart/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { env } from '../../platform/config/env.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { StorageService } from '../../platform/storage/storage.service.js';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { resolveSessionHold } from '../../common/session-hold.js';
import { toAuthenticatedUserWithPhoto } from '../users/profile-photo.util.js';
import { clearRefreshCookie, setRefreshCookie } from './refresh-cookie.js';

const scrypt = promisify(scryptCallback);

/** S6-VV-92 — account lockout, independent of the IP-based 'auth.login' rate-limit policy. */
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

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
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
  ) {}

  tryVerifyAccessToken(header?: string): RequestUser | null {
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
      return null;
    }
    try {
      return this.jwt.verify<RequestUser>(header.slice('Bearer '.length));
    } catch {
      return null;
    }
  }

  async login(email: string, password: string, reply: FastifyReply): Promise<AuthTokenResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { institution: true, company: true, primaryTrack: true, secondaryTrack: true },
    });

    if (user?.loginLockedUntil && user.loginLockedUntil > new Date()) {
      const retryAfterSeconds = Math.ceil((user.loginLockedUntil.getTime() - Date.now()) / 1000);
      throw new HttpException(
        {
          error: 'account_locked',
          message: `Too many failed attempts. Please wait ${String(retryAfterSeconds)} seconds before retrying.`,
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      if (user) {
        await this.registerFailedLoginAttempt(user.id, user.failedLoginAttempts);
      }
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'Email or password is incorrect.',
        statusCode: 401,
      });
    }
    assertTenantLoginAllowed(user);
    if (user.deactivatedAt) {
      throw unauthorized('This account has been deactivated.');
    }
    // Only after the password checks out, so this never reveals whether an email is registered.
    assertEmailVerified(user);

    if (user.failedLoginAttempts > 0 || user.loginLockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, loginLockedUntil: null },
      });
    }

    await this.auditPublisher.record({
      actorId: user.id,
      action: 'auth.login',
      resourceType: 'user',
      resourceId: user.id,
      reasonCode: null,
    });
    return this.issueSession(user, reply);
  }

  /** S6-VV-92 — locks the account for LOCKOUT_MINUTES once MAX_FAILED_LOGIN_ATTEMPTS is reached. */
  private async registerFailedLoginAttempt(
    userId: string,
    currentFailedAttempts: number,
  ): Promise<void> {
    const nextFailedAttempts = currentFailedAttempts + 1;
    const shouldLock = nextFailedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: shouldLock ? 0 : nextFailedAttempts,
        ...(shouldLock
          ? { loginLockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) }
          : {}),
      },
    });
    if (shouldLock) {
      await this.auditPublisher.record({
        actorId: userId,
        action: 'auth.account_locked',
        resourceType: 'user',
        resourceId: userId,
        reasonCode: null,
      });
    }
  }

  async listSelectableInstitutions(): Promise<SelectableInstitutionDto[]> {
    return this.prisma.institution.findMany({
      where: { deactivatedAt: null, heldAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  /** Creates the STUDENT without a session: they sign in once the emailed link is confirmed. */
  async register(body: RegisterRequest): Promise<UserWithAuthIncludes> {
    const email = body.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException({
        error: 'conflict',
        message: 'A user with this email already exists.',
        statusCode: 409,
      });
    }

    const institution = await this.prisma.institution.findUnique({
      where: { id: body.institutionId },
    });
    if (!institution || institution.deactivatedAt || institution.heldAt) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Institution not found.',
        statusCode: 404,
      });
    }

    const passwordHash = await hashPassword(body.password);
    const user = await this.prisma.user.create({
      data: {
        email,
        fullName: body.fullName,
        passwordHash,
        role: 'STUDENT',
        emailVerified: false,
        institutionId: institution.id,
      },
      include: { institution: true, company: true, primaryTrack: true, secondaryTrack: true },
    });

    await this.auditPublisher.record({
      actorId: user.id,
      action: 'auth.register',
      resourceType: 'user',
      resourceId: user.id,
      reasonCode: null,
    });
    return user;
  }

  /** Issues tokens without re-checking password; caller must enforce tenant gates when appropriate. */
  async issueSessionAfterInviteAccept(
    user: UserWithAuthIncludes,
    reply: FastifyReply,
  ): Promise<AuthTokenResponse> {
    assertTenantLoginAllowed(user);
    return this.issueSession(user, reply);
  }

  async registerStudent(
    dto: RegisterStudentRequest,
    reply: FastifyReply,
  ): Promise<AuthTokenResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    if (isDisallowedEndorserEmailDomain(normalizedEmail)) {
      throw new UnprocessableEntityException({
        error: 'personal_email_not_allowed',
        message:
          'Personal email addresses (e.g. Gmail, Yahoo) are not permitted. Please use your official university email.',
        statusCode: 422,
      });
    }

    const emailDomain = normalizedEmail.split('@')[1];
    if (!emailDomain) {
      throw new UnprocessableEntityException({
        error: 'invalid_email_domain',
        message: 'Invalid email address domain.',
        statusCode: 422,
      });
    }

    const institutions = await this.prisma.institution.findMany({
      select: { id: true, domain: true },
    });
    const matchedInstitution = institutions.find((inst) => {
      const cleanInstDomain = inst.domain.trim().toLowerCase();
      return emailDomain === cleanInstDomain || emailDomain.endsWith(`.${cleanInstDomain}`);
    });

    if (!matchedInstitution) {
      throw new UnprocessableEntityException({
        error: 'unregistered_university_domain',
        message:
          'Your university domain is not registered on SMART. Please contact your placement administrator.',
        statusCode: 422,
      });
    }

    const passwordHash = await hashPassword(dto.password);

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        return tx.user.create({
          data: {
            email: normalizedEmail,
            fullName: dto.fullName,
            passwordHash,
            role: 'STUDENT',
            provider: 'PASSWORD',
            emailVerified: false,
            institutionId: matchedInstitution.id,
            onboardingCompleted: false,
          },
          include: {
            institution: true,
            company: true,
            primaryTrack: true,
            secondaryTrack: true,
          },
        });
      });

      return this.issueSession(user, reply);
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException({
          error: 'email_exists',
          message: 'An account with this email address already exists.',
          statusCode: 409,
        });
      }
      throw err;
    }
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
      await this.auditPublisher.record({
        actorId: existing.userId,
        action: 'auth.refresh_reuse_detected',
        resourceType: 'user',
        resourceId: existing.userId,
        reasonCode: null,
        metadata: { familyId: existing.familyId },
      });
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
    if (!isEmailVerifiedForLogin(existing.user)) {
      clearRefreshCookie(reply);
      assertEmailVerified(existing.user);
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
        await this.auditPublisher.record({
          actorId: existing.userId,
          action: 'auth.logout',
          resourceType: 'user',
          resourceId: existing.userId,
          reasonCode: null,
        });
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

  /** S6-VV-93 — one row per active session, for the SUPER_ADMIN sessions panel. */
  async listActiveSessions(filter: ListActiveSessionsQuery): Promise<ActiveSessionDto[]> {
    const rows = await this.prisma.refreshToken.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
        ...(filter.userId ? { userId: filter.userId } : {}),
        ...(filter.email ? { user: { email: filter.email.toLowerCase() } } : {}),
      },
      include: { user: { select: { email: true, fullName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      userEmail: row.user.email,
      userFullName: row.user.fullName,
      userRole: row.user.role,
      familyId: row.familyId,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
    }));
  }

  /** S6-VV-93 — forcefully terminates a session (its whole refresh-token family), audited. */
  async revokeSession(sessionId: string, actorId: string, reason: string): Promise<void> {
    const session = await this.prisma.refreshToken.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Session not found.',
        statusCode: 404,
      });
    }
    if (session.revokedAt || session.expiresAt < new Date()) {
      throw new ConflictException({
        error: 'session_already_inactive',
        message: 'This session is already inactive.',
        statusCode: 409,
      });
    }

    await this.revokeFamily(session.familyId);
    await this.auditPublisher.record({
      actorId,
      action: 'auth.session_revoked',
      resourceType: 'user',
      resourceId: session.userId,
      reasonCode: reason,
      metadata: { sessionId, familyId: session.familyId },
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
    if (user.role !== 'COMPANY') {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'You do not have permission to perform this action.',
        statusCode: 403,
      });
    }
    const base = await toAuthenticatedUserWithPhoto(this.storage, user);
    return CompanyPortalAccountSchema.parse({
      ...base,
      companyVerificationStatus: user.company?.verificationStatus ?? 'APPROVED',
      companyWebsite: user.company?.website ?? null,
      companyIndustry: user.company?.taxonomyDomain ?? null,
      companyLocation: user.company?.location ?? null,
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

/** Students must confirm their email before they can sign in (#156). Other roles are invited. */
function isEmailVerifiedForLogin(user: {
  role: AuthenticatedUser['role'];
  emailVerified: boolean;
}): boolean {
  return user.role !== 'STUDENT' || user.emailVerified;
}

function assertEmailVerified(user: { role: AuthenticatedUser['role']; emailVerified: boolean }) {
  if (isEmailVerifiedForLogin(user)) return;
  throw new ForbiddenException({
    error: EMAIL_NOT_VERIFIED_ERROR,
    message:
      'Verify your email before signing in. Use the link we emailed you, or ask for a new one.',
    statusCode: 403,
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
