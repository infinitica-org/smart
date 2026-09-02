import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  AuthenticatedUser,
  CandidateOnboardingProfileResponse,
  ChangePasswordRequest,
  CompleteCandidateOnboardingRequest,
  EnrollTrackRequest,
} from '@smart/contracts';
import {
  CandidateOnboardingProfileSchema,
  CompleteCandidateOnboardingRequestSchema,
} from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import {
  AuthService,
  hashPassword,
  toAuthenticatedUser,
  verifyPassword,
} from '../auth/auth.service.js';

@Injectable()
export class UsersService {
  readonly owner = 'Vishal V';
  readonly purpose = 'Current user profile, track enrolment, and CN-T01 onboarding completion.';

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  async getMe(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { institution: true, company: true, primaryTrack: true, secondaryTrack: true },
    });
    if (!user) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'User not found.',
        statusCode: 404,
      });
    }
    return toAuthenticatedUser(user);
  }

  async getOnboarding(userId: string): Promise<CandidateOnboardingProfileResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'STUDENT') {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Only students have candidate onboarding profiles.',
        statusCode: 403,
      });
    }

    const profile = user.onboardingDetails
      ? CandidateOnboardingProfileSchema.safeParse(user.onboardingDetails)
      : null;

    return {
      onboardingCompleted: user.onboardingCompleted,
      profile: profile?.success ? profile.data : null,
    };
  }

  async completeOnboarding(userId: string, body: unknown): Promise<AuthenticatedUser> {
    const parsed = CompleteCandidateOnboardingRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'validation_error',
        message: 'Onboarding payload is invalid.',
        statusCode: 400,
        details: parsed.error.flatten(),
      });
    }

    const request: CompleteCandidateOnboardingRequest = parsed.data;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'STUDENT') {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Only students may complete candidate onboarding.',
        statusCode: 403,
      });
    }

    const now = new Date();
    const details = {
      ...request,
      dpdpConsentAt: now.toISOString(),
      completedAt: now.toISOString(),
    };

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: `${request.firstName} ${request.lastName}`.trim(),
        onboardingCompleted: true,
        onboardingDetails: details as Prisma.InputJsonValue,
        dpdpConsentAt: now,
      },
      include: { institution: true, company: true, primaryTrack: true, secondaryTrack: true },
    });

    return toAuthenticatedUser(updated);
  }

  async enrollTrack(userId: string, body: EnrollTrackRequest): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'STUDENT') {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Only students may enroll on tracks.',
        statusCode: 403,
      });
    }

    const track = await this.prisma.track.findUnique({ where: { code: body.trackCode } });
    if (!track) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Track not found.',
        statusCode: 404,
      });
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data:
        body.slot === 'SECONDARY' ? { secondaryTrackId: track.id } : { primaryTrackId: track.id },
      include: { institution: true, company: true, primaryTrack: true, secondaryTrack: true },
    });

    return toAuthenticatedUser(updated);
  }

  async changePassword(userId: string, body: ChangePasswordRequest): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'User not found.',
        statusCode: 404,
      });
    }
    if (!(await verifyPassword(body.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'Email or password is incorrect.',
        statusCode: 401,
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(body.newPassword) },
    });
    await this.auth.revokeAllForUser(userId);
  }
}
