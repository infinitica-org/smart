import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  CandidateResumeFile,
  CandidateResumeStateResponse,
  DeleteResumeResponse,
  UploadProfilePhotoResponse,
  UploadResumeResponse,
} from '@smart/contracts';
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
  CANDIDATE_RESUME_FILES_MAX,
  CandidateResumeFileSchema,
  CandidateResumeFilesSchema,
  CompleteCandidateOnboardingRequestSchema,
  DeleteResumeRequestSchema,
  SaveCandidateOnboardingDraftRequestSchema,
  SMART_TOPICS,
} from '@smart/contracts';
import type { Prisma } from '../../generated/prisma/index.js';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { StorageService } from '../../platform/storage/storage.service.js';
import { AuthService, hashPassword, verifyPassword } from '../auth/auth.service.js';
import { resolveProfilePhotoUrl, toAuthenticatedUserWithPhoto } from './profile-photo.util.js';

const PROFILE_PHOTO_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024;
const RESUME_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);
const MAX_RESUME_BYTES = 5 * 1024 * 1024;

@Injectable()
export class UsersService {
  readonly owner = 'Vishal V';
  readonly purpose =
    'Current user profile, track enrolment, and CN-T01 minimal onboarding completion.';

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService,
    @Inject(StorageService) private readonly storage: StorageService,
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
    return toAuthenticatedUserWithPhoto(this.storage, user);
  }

  async uploadProfilePhoto(
    userId: string,
    file: { buffer: Buffer; fileName: string; mimeType: string },
  ): Promise<UploadProfilePhotoResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'STUDENT') {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Only students may upload a profile photo.',
        statusCode: 403,
      });
    }

    if (!PROFILE_PHOTO_MIME_TYPES.has(file.mimeType)) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Only JPEG, PNG, and WebP images are accepted.',
        statusCode: 400,
      });
    }
    if (file.buffer.byteLength > MAX_PROFILE_PHOTO_BYTES) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'The profile photo must be 2MB or smaller.',
        statusCode: 400,
      });
    }

    const objectKey = await this.storage.upload({
      buffer: file.buffer,
      namespace: `profile-photos/${userId}`,
      fileName: file.fileName,
      contentType: file.mimeType,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { profilePhotoObjectKey: objectKey },
    });

    const profilePhotoUrl = await resolveProfilePhotoUrl(this.storage, objectKey);
    if (!profilePhotoUrl) {
      throw new BadRequestException({
        error: 'upload_failed',
        message: 'The profile photo could not be stored.',
        statusCode: 400,
      });
    }

    return { profilePhotoUrl };
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
      profilePhotoUrl: await resolveProfilePhotoUrl(this.storage, user.profilePhotoObjectKey),
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
    const existing =
      user.onboardingDetails && typeof user.onboardingDetails === 'object'
        ? (user.onboardingDetails as Record<string, unknown>)
        : {};
    const merged = user.onboardingCompleted
      ? this.mergeProgressiveProfileDetails(existing, parsed.data)
      : {
          ...existing,
          ...parsed.data,
          savedAt: new Date().toISOString(),
        };

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        onboardingDetails: merged as Prisma.InputJsonValue,
        // Denormalized onto the User row (not just onboardingDetails JSON) so matching can
        // filter on them directly — see mergeProgressiveProfileDetails for the JSON side.
        ...(parsed.data.academicScores?.cgpa !== undefined
          ? { cgpa: parsed.data.academicScores.cgpa }
          : {}),
        ...(parsed.data.academicScores?.sscPercentage !== undefined
          ? { sscPercentage: parsed.data.academicScores.sscPercentage }
          : {}),
        ...(parsed.data.academicScores?.hscPercentage !== undefined
          ? { hscPercentage: parsed.data.academicScores.hscPercentage }
          : {}),
        ...(parsed.data.academicScores?.hasActiveBacklog !== undefined
          ? { hasActiveBacklog: parsed.data.academicScores.hasActiveBacklog }
          : {}),
      },
    });

    if (user.onboardingCompleted) {
      return this.getOnboarding(userId);
    }

    const refreshed = await this.prisma.user.findUnique({ where: { id: userId } });

    return {
      onboardingCompleted: false,
      profile: null,
      draft: CandidateOnboardingDraftSchema.parse(merged),
      profilePhotoUrl: await resolveProfilePhotoUrl(this.storage, refreshed?.profilePhotoObjectKey),
    };
  }

  private readResumeFiles(details: Record<string, unknown>): CandidateResumeFile[] {
    const parsedArray = CandidateResumeFilesSchema.safeParse(details.resumeFiles);
    if (parsedArray.success && parsedArray.data.length > 0) {
      return parsedArray.data;
    }
    const single = CandidateResumeFileSchema.safeParse(details.resumeFile);
    return single.success ? [single.data] : [];
  }

  async getResumeState(userId: string): Promise<CandidateResumeStateResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'STUDENT') {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Only students have resume files.',
        statusCode: 403,
      });
    }

    const details =
      user.onboardingDetails && typeof user.onboardingDetails === 'object'
        ? (user.onboardingDetails as Record<string, unknown>)
        : {};
    const resumeFiles = this.readResumeFiles(details);
    return { resumeFile: resumeFiles[0] ?? null, resumeFiles };
  }

  async uploadResume(
    userId: string,
    file: { buffer: Buffer; fileName: string; mimeType: string },
  ): Promise<UploadResumeResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'STUDENT') {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Only students may upload a resume.',
        statusCode: 403,
      });
    }

    const extOk = /\.(pdf|docx?|txt)$/i.test(file.fileName);
    if (!RESUME_MIME_TYPES.has(file.mimeType) && !extOk) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Only PDF, DOCX, DOC, and TXT files are accepted.',
        statusCode: 400,
      });
    }
    if (file.buffer.byteLength > MAX_RESUME_BYTES) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'The resume must be 5MB or smaller.',
        statusCode: 400,
      });
    }

    const objectKey = await this.storage.upload({
      buffer: file.buffer,
      namespace: `resumes/${userId}`,
      fileName: file.fileName,
      contentType: file.mimeType,
    });

    const resumeFile = CandidateResumeFileSchema.parse({
      fileName: file.fileName,
      objectKey,
      mimeType: file.mimeType,
      fileSizeBytes: file.buffer.byteLength,
      uploadedAt: new Date().toISOString(),
      lastParsedAt: null,
    });

    const existing =
      user.onboardingDetails && typeof user.onboardingDetails === 'object'
        ? (user.onboardingDetails as Record<string, unknown>)
        : {};
    const currentFiles = this.readResumeFiles(existing);
    if (currentFiles.length >= CANDIDATE_RESUME_FILES_MAX) {
      throw new UnprocessableEntityException({
        error: 'resume_limit_reached',
        message: `You can store up to ${CANDIDATE_RESUME_FILES_MAX} resume files. Remove one before uploading another.`,
        statusCode: 422,
      });
    }

    const resumeFiles = [resumeFile, ...currentFiles];
    const merged = this.mergeProgressiveProfileDetails(existing, {
      resumeFile,
      resumeFiles,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingDetails: merged as Prisma.InputJsonValue },
    });

    return { resumeFile, resumeFiles };
  }

  async deleteResume(userId: string, body: unknown): Promise<DeleteResumeResponse> {
    const { objectKey } = DeleteResumeRequestSchema.parse(body);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'STUDENT') {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Only students may manage resume files.',
        statusCode: 403,
      });
    }

    const existing =
      user.onboardingDetails && typeof user.onboardingDetails === 'object'
        ? (user.onboardingDetails as Record<string, unknown>)
        : {};
    const currentFiles = this.readResumeFiles(existing);
    const resumeFiles = currentFiles.filter((file) => file.objectKey !== objectKey);
    if (resumeFiles.length === currentFiles.length) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Resume file not found.',
        statusCode: 404,
      });
    }

    const merged = this.mergeProgressiveProfileDetails(existing, {
      resumeFiles,
      resumeFile: resumeFiles[0] ?? null,
    });
    if (!resumeFiles[0]) {
      delete merged.resumeFile;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingDetails: merged as Prisma.InputJsonValue },
    });

    return { resumeFiles };
  }

  private mergeProgressiveProfileDetails(
    existing: Record<string, unknown>,
    patch: Record<string, unknown>,
  ): Record<string, unknown> {
    const merged: Record<string, unknown> = { ...existing, ...patch };

    if (patch.jobPreferences && typeof patch.jobPreferences === 'object') {
      const current =
        existing.jobPreferences && typeof existing.jobPreferences === 'object'
          ? (existing.jobPreferences as Record<string, unknown>)
          : {};
      merged.jobPreferences = {
        ...current,
        ...(patch.jobPreferences as Record<string, unknown>),
      };
    }

    if (patch.academicScores && typeof patch.academicScores === 'object') {
      const current =
        existing.academicScores && typeof existing.academicScores === 'object'
          ? (existing.academicScores as Record<string, unknown>)
          : {};
      merged.academicScores = {
        ...current,
        ...(patch.academicScores as Record<string, unknown>),
      };
    }

    if (patch.socialVerification && typeof patch.socialVerification === 'object') {
      const current =
        existing.socialVerification && typeof existing.socialVerification === 'object'
          ? (existing.socialVerification as Record<string, unknown>)
          : {};
      merged.socialVerification = {
        ...current,
        ...(patch.socialVerification as Record<string, unknown>),
      };
    }

    return merged;
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
        cgpa: request.academicScores?.cgpa ?? undefined,
        sscPercentage: request.academicScores?.sscPercentage ?? undefined,
        hscPercentage: request.academicScores?.hscPercentage ?? undefined,
        hasActiveBacklog: request.academicScores?.hasActiveBacklog ?? undefined,
      },
      include: { institution: true, company: true, primaryTrack: true, secondaryTrack: true },
    });

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

    return toAuthenticatedUserWithPhoto(this.storage, updated);
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

    return toAuthenticatedUserWithPhoto(this.storage, updated);
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
