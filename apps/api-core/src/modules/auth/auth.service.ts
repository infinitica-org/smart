import { scrypt as scryptCallback, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthTokenResponse, AuthenticatedUser } from '@smart/contracts';
import { mailService, passwordResetTemplate } from '@smart/mail';
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
      include: { institution: true, company: true, primaryTrack: true, secondaryTrack: true },
    });
    if (!user) {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'Email or password is incorrect.',
        statusCode: 401,
      });
    }

    if (!user.passwordHash || user.status === 'PENDING_ACTIVATION') {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'Activate your account from the invite email before logging in.',
        statusCode: 401,
      });
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'This account is not active.',
        statusCode: 401,
      });
    }

    if (!(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'Email or password is incorrect.',
        statusCode: 401,
      });
    }

    return this.issueSession(user);
  }

  async activateAccount(token: string, password: string): Promise<AuthTokenResponse> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const invitation = await this.prisma.candidateInvitation.findUnique({
      where: { tokenHash },
    });

    if (!invitation || invitation.usedAt || invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired activation token.');
    }

    const pendingUser = await this.prisma.user.findUnique({
      where: { id: invitation.userId },
    });
    if (!pendingUser) throw new NotFoundException('User not found');

    const hashedPassword = await hashPassword(password);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: invitation.userId },
        data: {
          passwordHash: hashedPassword,
          status: 'ACTIVE',
          role: userRoleAfterActivation(pendingUser.role) as any,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      }),
      this.prisma.candidateInvitation.update({
        where: { id: invitation.id },
        data: { usedAt: new Date() },
      }),
    ]);

    const user = await this.prisma.user.findUnique({
      where: { id: invitation.userId },
      include: { institution: true, company: true, primaryTrack: true, secondaryTrack: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.issueSession(user);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.passwordHash || user.status !== 'ACTIVE') {
      return;
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
    await mailService.sendMail({
      to: user.email,
      subject: 'Reset your SMART password',
      html: passwordResetTemplate(resetUrl),
    });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }

    const hashedPassword = await hashPassword(password);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash: hashedPassword,
          status: 'ACTIVE',
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  private async issueSession(user: {
    id: string;
    email: string;
    fullName: string;
    role: AuthenticatedUser['role'];
    status: AuthenticatedUser['status'];
    provider: AuthenticatedUser['provider'];
    emailVerified: boolean;
    institutionId: string | null;
    companyId: string | null;
    createdAt: Date;
    institution: { name: string } | null;
    company: { name: string } | null;
    primaryTrack: { code: string } | null;
    secondaryTrack: { code: string } | null;
  }): Promise<AuthTokenResponse> {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
      inst: user.institutionId,
      trk: [user.primaryTrack?.code, user.secondaryTrack?.code].filter(Boolean),
      fam: 'default-fam',
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresInSeconds: env.JWT_ACCESS_TTL_SECONDS,
      user: toAuthenticatedUser(user),
    };
  }
}

function userRoleAfterActivation(role: string): AuthenticatedUser['role'] {
  return role === 'STUDENT_CANDIDATE' ? 'STUDENT' : (role as AuthenticatedUser['role']);
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
  status: AuthenticatedUser['status'];
  provider: AuthenticatedUser['provider'];
  emailVerified: boolean;
  institutionId: string | null;
  companyId: string | null;
  createdAt: Date;
  institution: { name: string } | null;
  company: { name: string } | null;
  primaryTrack: { code: string } | null;
  secondaryTrack: { code: string } | null;
}): AuthenticatedUser {
  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    institutionId: user.institutionId,
    institutionName: user.institution?.name ?? null,
    companyId: user.companyId,
    companyName: user.company?.name ?? null,
    primaryTrack: (user.primaryTrack?.code as AuthenticatedUser['primaryTrack']) ?? null,
    secondaryTrack: (user.secondaryTrack?.code as AuthenticatedUser['secondaryTrack']) ?? null,
    provider: user.provider,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
  };
}
