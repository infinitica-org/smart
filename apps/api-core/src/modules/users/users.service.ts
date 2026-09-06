import {
  BadRequestException,
  ConflictException,
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
  LinkedinVerification,
} from '@smart/contracts';
import {
  CandidateOnboardingDraftSchema,
  CandidateOnboardingProfileSchema,
  CompleteCandidateOnboardingRequestSchema,
  SaveCandidateOnboardingDraftRequestSchema,
  SkillProficiencySchema,
  SKILL_DEFINITIONS,
  SMART_TOPICS,
} from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import {
  AuthService,
  hashPassword,
  toAuthenticatedUser,
  verifyPassword,
} from '../auth/auth.service.js';
import { AssessmentService } from '../assessment/assessment.service.js';

/**
 * Case-insensitive catalog skill NAME -> code, restricted to skills that take a
 * single self-declared proficiency (mirrors `candidate-skills-discovered.consumer.ts`'s
 * `SKILL_NAME_TO_CODE`). `LANGUAGE_PROFICIENCY`/`FRONTEND_BACKEND_FRAMEWORK` never
 * appear here by name — the onboarding wizard sends per-item names for those
 * (e.g. "Python", "React") instead of the catalog's family name, so they never
 * resolve to a code and are correctly left onboarding-JSON-only for now.
 */
const MANDATORY_SKILL_NAME_TO_CODE = new Map(
  SKILL_DEFINITIONS.filter(
    (skill) => skill.stream === 'UNIVERSAL' || skill.stream === 'SOFTWARE_DEVELOPMENT',
  ).map((skill) => [skill.name.toLowerCase(), skill.code]),
);

@Injectable()
export class UsersService {
  readonly owner = 'Vishal V';
  readonly purpose = 'Current user profile, track enrolment, and CN-T01 onboarding completion.';

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService,
    @Inject(AssessmentService) private readonly assessment: AssessmentService,
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

    const profile =
      user.onboardingCompleted && user.onboardingDetails
        ? CandidateOnboardingProfileSchema.safeParse(user.onboardingDetails)
        : null;
    const draft =
      !user.onboardingCompleted && user.onboardingDetails
        ? CandidateOnboardingDraftSchema.safeParse(user.onboardingDetails)
        : null;

    return {
      onboardingCompleted: user.onboardingCompleted,
      profile: profile?.success ? profile.data : null,
      draft: draft?.success ? draft.data : null,
    };
  }

  /** Persist in-progress onboarding data so it survives a lost session or a closed tab. */
  async saveOnboardingDraft(
    userId: string,
    body: unknown,
  ): Promise<CandidateOnboardingProfileResponse> {
    const parsed = SaveCandidateOnboardingDraftRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'validation_error',
        message: 'Onboarding draft payload is invalid.',
        statusCode: 400,
        details: parsed.error.flatten(),
      });
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'STUDENT') {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Only students have candidate onboarding profiles.',
        statusCode: 403,
      });
    }
    if (user.onboardingCompleted) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Onboarding is already complete; drafts can no longer be saved.',
        statusCode: 403,
      });
    }

    const existing =
      user.onboardingDetails && typeof user.onboardingDetails === 'object'
        ? (user.onboardingDetails as Record<string, unknown>)
        : {};
    const merged = {
      ...existing,
      ...parsed.data,
      savedAt: new Date().toISOString(),
    };

    await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingDetails: merged as Prisma.InputJsonValue },
    });

    return {
      onboardingCompleted: false,
      profile: null,
      draft: CandidateOnboardingDraftSchema.parse(merged),
    };
  }

  /**
   * Persists the LinkedIn OIDC verification result from the OAuth callback.
   * A nested merge (unlike `saveOnboardingDraft`'s top-level spread) so it
   * never clobbers the rest of the in-progress draft — the callback runs
   * outside the wizard's normal save cycle, on a bare redirect with no form
   * state of its own to send back.
   */
  async mergeLinkedinVerification(
    userId: string,
    verification: LinkedinVerification,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const existing =
      user.onboardingDetails && typeof user.onboardingDetails === 'object'
        ? (user.onboardingDetails as Record<string, unknown>)
        : {};
    const existingSocial =
      existing.socialVerification && typeof existing.socialVerification === 'object'
        ? (existing.socialVerification as Record<string, unknown>)
        : {};

    const merged = {
      ...existing,
      socialVerification: {
        ...existingSocial,
        linkedin: verification,
      },
    };

    await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingDetails: merged as Prisma.InputJsonValue },
    });
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

    // Mandatory Core/Niche skills are self-declared during onboarding itself
    // (not the best-effort async GitHub-derived path below), so every one of
    // them is guaranteed a real SkillClaim rather than a "best effort" one.
    // Declared synchronously but tolerantly: a per-skill conflict (already
    // claimed/locked, e.g. a retried completion call) must never fail the
    // onboarding completion that already succeeded above.
    const requestUser = { sub: userId, role: user.role, inst: user.institutionId };
    for (const entry of request.skills) {
      if (entry.type !== 'technical') continue;
      const skillCode = MANDATORY_SKILL_NAME_TO_CODE.get(entry.name.toLowerCase());
      if (!skillCode) continue;
      const proficiency = SkillProficiencySchema.safeParse(entry.proficiency);
      if (!proficiency.success) continue;
      try {
        await this.assessment.declareSkillClaim(requestUser, {
          skillCode,
          proficiency: proficiency.data,
        });
      } catch (error) {
        if (error instanceof ConflictException || error instanceof ForbiddenException) continue;
        throw error;
      }
    }

    const selectedSkillNames = request.skillDiscovery?.selectedSkillNames ?? [];
    // Only the languages the candidate actually kept checked count toward
    // skill derivation — a deselected suggestion (e.g. they unchecked "CSS")
    // must not still influence what gets auto-declared downstream.
    const languages = (request.skillDiscovery?.suggestedFromGithub ?? []).filter((entry) =>
      selectedSkillNames.includes(entry.language),
    );
    if (selectedSkillNames.length > 0) {
      // Fire-and-forget via the outbox: skill-catalog matching is a
      // downstream concern (owned by `assessment`) and must never make
      // onboarding completion wait on it or fail because of it.
      await this.outbox
        .enqueueEnvelope({
          topic: SMART_TOPICS.candidateSkillsDiscovered,
          partitionKey: userId,
          eventType: SMART_TOPICS.candidateSkillsDiscovered,
          source: 'users',
          data: { userId, languages, selectedSkillNames },
        })
        .catch(() => {
          /* best-effort — outbox row is durable even if this call throws */
        });
    }

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
