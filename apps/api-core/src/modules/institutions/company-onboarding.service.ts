import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ConflictException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { Prisma } from '../../generated/prisma/index.js';
import type {
  CompanyOnboardingSessionDto,
  CompanyRepresentative,
  CompanySignupProfile,
  CompanyVerification,
  SendCorporateEmailVerificationResponse,
  StartCompanyOnboardingRequest,
  StartCompanyOnboardingResponse,
  SubmitCompanyOnboardingResponse,
  UpdateCompanyOnboardingDraftRequest,
  VerifyCorporateEmailRequest,
  VerifyCorporateEmailResponse,
} from '@smart/contracts';
import {
  CompanyOnboardingSessionDtoSchema,
  CompanyRepresentativeSchema,
  CompanySignupProfileSchema,
  CompanyVerificationSchema,
  StartCompanyOnboardingResponseSchema,
  SubmitCompanyOnboardingRequestSchema,
  SubmitCompanyOnboardingResponseSchema,
  SendCorporateEmailVerificationResponseSchema,
  VerifyCorporateEmailResponseSchema,
} from '@smart/contracts';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import {
  EMAIL_QUEUE,
  type EmailJobPayload,
  type EmailTemplateName,
} from '../../platform/mailer/mailer.types.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { extractDomain, normalizeCompanyName } from '../work-experience/company-name.util.js';
import {
  EMAIL_RESEND_COOLDOWN_SECONDS,
  emailResendAvailableAt,
  emailVerificationExpiresAt,
  generateEmailVerificationCode,
  generateOnboardingSessionToken,
  hashOnboardingSecret,
  mergeDraftStore,
  mergeRepresentativeSnapshot,
  onboardingSessionExpiresAt,
  parseDraftStore,
} from './company-onboarding.util.js';
import { CompanyOnboardingDocumentService } from './company-onboarding-document.service.js';
import {
  requireOnboardingSessionByToken,
  resolveCurrentSessionVerification,
} from './company-onboarding-session.access.js';
import { incompleteSubmissionError } from './company-onboarding-submit-issues.js';
import { OrganizationsService } from './organizations.service.js';

const EDITABLE_STATUSES = new Set([
  'DRAFT',
  'EMAIL_VERIFICATION_PENDING',
  'EMAIL_VERIFIED',
  'RESUBMISSION_ALLOWED',
]);

type SessionRow = Prisma.CompanyOnboardingSessionGetPayload<{
  include: { company: true };
}>;

@Injectable()
export class CompanyOnboardingService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditPublisherService) private readonly auditPublisher: AuditPublisherService,
    @Inject(OrganizationsService) private readonly organizationsService: OrganizationsService,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue<EmailJobPayload>,
    @Inject(CompanyOnboardingDocumentService)
    private readonly documents: CompanyOnboardingDocumentService,
  ) {}

  async startSession(body: StartCompanyOnboardingRequest): Promise<StartCompanyOnboardingResponse> {
    const workEmail = body.representative.workEmail.toLowerCase();
    await this.assertStartAllowed(workEmail, body.website);

    const { raw, hash } = generateOnboardingSessionToken();
    const expiresAt = onboardingSessionExpiresAt();
    const representativeSnapshot = {
      fullName: body.representative.fullName,
      workEmail,
    };

    const session = await this.prisma.companyOnboardingSession.create({
      data: {
        sessionTokenHash: hash,
        expiresAt,
        onboardingStatus: 'EMAIL_VERIFICATION_PENDING',
        representativeEmail: workEmail,
        representativeSnapshot,
        profileDraft: body.website ? { profile: { website: body.website } } : undefined,
      },
    });

    await this.auditPublisher.record({
      actorId: null,
      action: 'company.onboarding.started',
      resourceType: 'company_onboarding_session',
      resourceId: session.id,
      reasonCode: 'started',
      metadata: { sessionId: session.id },
    });

    return StartCompanyOnboardingResponseSchema.parse({
      sessionToken: raw,
      expiresAt: expiresAt.toISOString(),
      onboardingStatus: 'EMAIL_VERIFICATION_PENDING',
    });
  }

  async getSession(rawToken: string): Promise<CompanyOnboardingSessionDto> {
    const session = await requireOnboardingSessionByToken(this.prisma, rawToken);
    return await this.toSessionDto(session);
  }

  async updateDraft(
    rawToken: string,
    body: UpdateCompanyOnboardingDraftRequest,
  ): Promise<CompanyOnboardingSessionDto> {
    const session = await requireOnboardingSessionByToken(this.prisma, rawToken);
    this.assertEditable(session);

    const draft = parseDraftStore(session.profileDraft);
    const mergedDraft = mergeDraftStore(draft, {
      profile: body.profile,
      verification: body.verification,
    });
    const representative = mergeRepresentativeSnapshot(
      session.representativeSnapshot as Partial<CompanyRepresentative> | null,
      body.representative,
      session.representativeEmail,
    );

    const updated = await this.prisma.companyOnboardingSession.update({
      where: { id: session.id },
      data: {
        profileDraft: mergedDraft as Prisma.InputJsonValue,
        representativeSnapshot: representative as Prisma.InputJsonValue,
      },
      include: { company: true },
    });

    await this.auditPublisher.record({
      actorId: null,
      action: 'company.onboarding.draft_updated',
      resourceType: 'company_onboarding_session',
      resourceId: updated.id,
      reasonCode: 'draft_updated',
      metadata: { sessionId: updated.id, companyId: updated.companyId },
    });

    return await this.toSessionDto(updated);
  }

  async sendEmailVerification(rawToken: string): Promise<SendCorporateEmailVerificationResponse> {
    const session = await requireOnboardingSessionByToken(this.prisma, rawToken);
    if (!EDITABLE_STATUSES.has(session.onboardingStatus)) {
      throw new BadRequestException({
        error: 'invalid_state',
        message: 'Email verification cannot be sent for this onboarding session.',
        statusCode: 400,
      });
    }
    if (session.emailVerifiedAt) {
      throw new ConflictException({
        error: 'conflict',
        message: 'Email is already verified for this session.',
        statusCode: 409,
      });
    }

    const resendAt = emailResendAvailableAt(session.lastEmailSentAt);
    if (resendAt.getTime() > Date.now()) {
      throw new ConflictException({
        error: 'conflict',
        message: 'Please wait before requesting another verification email.',
        statusCode: 409,
        retryAfterSeconds: Math.ceil((resendAt.getTime() - Date.now()) / 1000),
      });
    }

    const { raw: code, hash } = generateEmailVerificationCode();
    const expiresAt = emailVerificationExpiresAt();
    const resendAvailableAt = new Date(Date.now() + EMAIL_RESEND_COOLDOWN_SECONDS * 1000);

    await this.prisma.companyOnboardingSession.update({
      where: { id: session.id },
      data: {
        emailVerificationCodeHash: hash,
        emailVerificationExpiresAt: expiresAt,
        lastEmailSentAt: new Date(),
      },
    });

    const rep = session.representativeSnapshot as { fullName?: string } | null;
    await this.emailQueue.add('send', {
      to: session.representativeEmail,
      template: 'company-onboarding-email-verify' satisfies EmailTemplateName,
      data: {
        fullName: rep?.fullName ?? 'there',
        verificationCode: code,
        expiresAtFormatted: expiresAt.toUTCString(),
      },
    });

    await this.auditPublisher.record({
      actorId: null,
      action: 'company.email.verification_sent',
      resourceType: 'company_onboarding_session',
      resourceId: session.id,
      reasonCode: 'verification_sent',
      metadata: { sessionId: session.id },
    });

    return SendCorporateEmailVerificationResponseSchema.parse({
      expiresAt: expiresAt.toISOString(),
      resendAvailableAt: resendAvailableAt.toISOString(),
    });
  }

  async verifyEmail(
    rawToken: string,
    body: VerifyCorporateEmailRequest,
  ): Promise<VerifyCorporateEmailResponse> {
    const session = await requireOnboardingSessionByToken(this.prisma, rawToken);
    if (session.emailVerifiedAt) {
      return VerifyCorporateEmailResponseSchema.parse({
        onboardingStatus: session.onboardingStatus,
        emailVerified: true,
      });
    }
    if (!session.emailVerificationCodeHash || !session.emailVerificationExpiresAt) {
      throw new BadRequestException({
        error: 'invalid_state',
        message: 'Request a verification code before verifying.',
        statusCode: 400,
      });
    }
    if (session.emailVerificationExpiresAt.getTime() < Date.now()) {
      throw new GoneException({
        error: 'expired',
        message: 'Verification code has expired.',
        statusCode: 410,
      });
    }

    const hash = hashOnboardingSecret(body.code.trim());
    if (hash !== session.emailVerificationCodeHash) {
      throw new BadRequestException({
        error: 'invalid_code',
        message: 'Verification code is incorrect.',
        statusCode: 400,
      });
    }

    const updated = await this.prisma.companyOnboardingSession.update({
      where: { id: session.id },
      data: {
        emailVerifiedAt: new Date(),
        onboardingStatus: 'EMAIL_VERIFIED',
        emailVerificationCodeHash: null,
        emailVerificationExpiresAt: null,
      },
    });

    await this.auditPublisher.record({
      actorId: null,
      action: 'company.email.verified',
      resourceType: 'company_onboarding_session',
      resourceId: session.id,
      reasonCode: 'verified',
      metadata: { sessionId: session.id },
    });

    return VerifyCorporateEmailResponseSchema.parse({
      onboardingStatus: updated.onboardingStatus,
      emailVerified: true,
    });
  }

  async submit(rawToken: string, body: unknown): Promise<SubmitCompanyOnboardingResponse> {
    SubmitCompanyOnboardingRequestSchema.parse(body);
    const session = await requireOnboardingSessionByToken(this.prisma, rawToken);
    if (session.onboardingStatus === 'PENDING_REVIEW' || session.onboardingStatus === 'SUBMITTED') {
      throw new ConflictException({
        error: 'conflict',
        message: 'This onboarding application has already been submitted.',
        statusCode: 409,
      });
    }
    if (!session.emailVerifiedAt) {
      throw new UnprocessableEntityException({
        error: 'validation_failed',
        message: 'Verify your corporate email before submitting.',
        statusCode: 422,
      });
    }
    if (
      session.onboardingStatus !== 'EMAIL_VERIFIED' &&
      session.onboardingStatus !== 'RESUBMISSION_ALLOWED'
    ) {
      throw new BadRequestException({
        error: 'invalid_state',
        message: 'Onboarding is not ready for submission.',
        statusCode: 400,
      });
    }

    const draft = parseDraftStore(session.profileDraft);
    const representativeResult = CompanyRepresentativeSchema.safeParse({
      ...(session.representativeSnapshot as object),
      workEmail: session.representativeEmail,
    });
    const profileResult = CompanySignupProfileSchema.safeParse({
      ...draft.profile,
      legalName: draft.profile?.legalName ?? draft.verification?.legalName,
    });
    const verificationResult = CompanyVerificationSchema.safeParse(draft.verification ?? {});
    if (!representativeResult.success || !profileResult.success || !verificationResult.success) {
      // A clear, actionable 422 instead of a raw Zod error surfacing as "Request failed validation."
      throw incompleteSubmissionError({
        results: {
          representative: representativeResult,
          profile: profileResult,
          verification: verificationResult,
        },
        hasVerificationData: draft.verification != null,
      });
    }
    const representative = representativeResult.data;
    const profile = profileResult.data;
    const verification = verificationResult.data;

    await this.assertSubmitDuplicates(profile, verification, session);

    const freePlan = await this.prisma.subscriptionPlan.findUnique({ where: { code: 'FREE' } });
    if (!freePlan) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Subscription plans have not been seeded.',
        statusCode: 404,
      });
    }

    const org = await this.organizationsService.resolveOrCreateOrganization({
      name: profile.legalName,
      website: profile.website,
      verifierEmail: representative.workEmail,
    });

    const submittedAt = new Date();
    const isResubmission =
      session.companyId != null && session.onboardingStatus === 'RESUBMISSION_ALLOWED';
    // Re-uploads after a rejection land on the reviewed submission; carry them forward.
    const previousVerification = isResubmission
      ? await resolveCurrentSessionVerification(this.prisma, session)
      : null;

    const result = await this.prisma.$transaction(async (tx) => {
      let companyId = session.companyId;

      if (!isResubmission) {
        const created = await this.createPendingCompanyInTransaction(tx, {
          profile,
          verification,
          organizationId: org.id,
          planId: freePlan.id,
        });
        companyId = created.companyId;
      } else if (companyId) {
        await tx.company.update({
          where: { id: companyId },
          data: { verificationStatus: 'PENDING', verificationReason: null },
        });
      }

      if (!companyId) {
        throw new UnprocessableEntityException({
          error: 'validation_failed',
          message: 'Company tenant could not be linked for submission.',
          statusCode: 422,
        });
      }

      const submission = await tx.companyVerification.create({
        data: {
          companyId,
          onboardingSessionId: session.id,
          registrationCountry: verification.registrationCountry,
          jurisdictionCode: verification.jurisdictionCode ?? null,
          legalName: verification.legalName,
          registeredAddress: verification.registeredAddress as Prisma.InputJsonValue,
          businessRegistrationNumber: verification.businessRegistrationNumber ?? null,
          taxId: verification.taxId ?? null,
          registrationAuthority: verification.registrationAuthority ?? null,
          submittedAt,
        },
      });

      if (previousVerification) {
        // Rejected files stay with the old submission as history; everything else is re-reviewed.
        await tx.companyVerificationDocument.updateMany({
          where: {
            companyVerificationId: previousVerification.id,
            reviewStatus: { not: 'REJECTED' },
          },
          data: { companyVerificationId: submission.id },
        });
      }

      await tx.companyOnboardingSession.update({
        where: { id: session.id },
        data: {
          companyId,
          onboardingStatus: 'PENDING_REVIEW',
          submittedAt,
        },
      });

      return { companyId, submissionId: submission.id };
    });

    await this.auditPublisher.record({
      actorId: null,
      action: 'company.onboarding.submitted',
      resourceType: 'company',
      resourceId: result.companyId,
      reasonCode: 'submitted',
      metadata: {
        sessionId: session.id,
        companyId: result.companyId,
        submissionId: result.submissionId,
        documentCount: 0,
      },
    });

    return SubmitCompanyOnboardingResponseSchema.parse({
      companyId: result.companyId,
      onboardingStatus: 'PENDING_REVIEW',
      verificationStatus: 'PENDING',
      submittedAt: submittedAt.toISOString(),
    });
  }

  private async createPendingCompanyInTransaction(
    tx: Prisma.TransactionClient,
    params: {
      profile: CompanySignupProfile;
      verification: CompanyVerification;
      organizationId: string;
      planId: string;
    },
  ): Promise<{ companyId: string }> {
    const slug = await this.allocateSlugInTransaction(tx, params.profile.displayName);
    const gstin =
      params.profile.address.country === 'IN' && params.verification.taxId?.trim()
        ? params.verification.taxId.trim()
        : null;

    const company = await tx.company.create({
      data: {
        name: params.profile.displayName,
        domain: slug,
        taxonomyDomain: params.profile.taxonomyDomain ?? null,
        website: params.profile.website,
        linkedinUrl: params.profile.linkedinUrl ?? null,
        sector: params.profile.sector,
        mode: params.profile.mode,
        sizeBand: params.profile.sizeBand,
        location: [params.profile.address.city, params.profile.address.stateProvince]
          .filter(Boolean)
          .join(', ')
          .slice(0, 120),
        gstin,
        planId: params.planId,
        verificationStatus: 'PENDING',
        organizationId: params.organizationId,
      },
    });
    return { companyId: company.id };
  }

  private async allocateSlugInTransaction(
    tx: Prisma.TransactionClient,
    name: string,
  ): Promise<string> {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60) || 'company';
    let slug = base;
    let n = 2;
    while (await tx.company.findUnique({ where: { domain: slug } })) {
      slug = `${base}-${n}`;
      n += 1;
    }
    return slug;
  }

  private assertEditable(session: SessionRow): void {
    if (!EDITABLE_STATUSES.has(session.onboardingStatus)) {
      throw new ConflictException({
        error: 'conflict',
        message: 'This onboarding session can no longer be edited.',
        statusCode: 409,
      });
    }
  }

  private async assertStartAllowed(workEmail: string, website?: string): Promise<void> {
    const existingUser = await this.prisma.user.findUnique({ where: { email: workEmail } });
    if (existingUser) {
      throw this.registrationConflict('DUPLICATE_REGISTRATION_REVIEW');
    }

    if (website) {
      const host = extractDomain(website);
      if (host) {
        const approved = await this.prisma.company.findFirst({
          where: {
            verificationStatus: 'APPROVED',
            OR: [{ website: { contains: host, mode: 'insensitive' } }, { domain: host }],
          },
        });
        if (approved) {
          throw this.registrationConflict('COMPANY_ALREADY_REGISTERED');
        }
      }
    }
  }

  private async assertSubmitDuplicates(
    profile: CompanySignupProfile,
    verification: CompanyVerification,
    session: SessionRow,
  ): Promise<void> {
    const normalizedLegal = normalizeCompanyName(verification.legalName);
    const websiteHost = extractDomain(profile.website);

    const approvedByGstin =
      verification.taxId &&
      (await this.prisma.company.findFirst({
        where: {
          gstin: verification.taxId.trim(),
          verificationStatus: 'APPROVED',
          id: session.companyId ? { not: session.companyId } : undefined,
        },
      }));
    if (approvedByGstin) {
      throw this.registrationConflict('COMPANY_ALREADY_REGISTERED');
    }

    const pendingCompany = await this.prisma.company.findFirst({
      where: {
        verificationStatus: 'PENDING',
        id: session.companyId ? { not: session.companyId } : undefined,
        OR: [
          ...(verification.taxId ? [{ gstin: verification.taxId.trim() }] : []),
          ...(websiteHost
            ? [{ website: { contains: websiteHost, mode: 'insensitive' as const } }]
            : []),
          { name: { equals: profile.displayName, mode: 'insensitive' as const } },
        ],
      },
    });
    if (pendingCompany) {
      throw this.registrationConflict('COMPANY_VERIFICATION_PENDING');
    }

    if (websiteHost) {
      const org = await this.prisma.organization.findFirst({
        where: { domain: websiteHost },
        include: { companies: { where: { verificationStatus: 'APPROVED' } } },
      });
      if (org && org.companies.length > 0) {
        throw this.registrationConflict('COMPANY_ALREADY_REGISTERED');
      }
    }

    const placementMatch = await this.prisma.placementEmployer.findFirst({
      where: { normalizedName: normalizedLegal },
    });
    if (placementMatch) {
      throw this.registrationConflict('DUPLICATE_REGISTRATION_REVIEW');
    }
  }

  private registrationConflict(code: string): ConflictException {
    return new ConflictException({
      error: 'conflict',
      message: 'Company registration cannot proceed at this time.',
      statusCode: 409,
      details: { code },
    });
  }

  private async toSessionDto(session: SessionRow): Promise<CompanyOnboardingSessionDto> {
    const draft = parseDraftStore(session.profileDraft);
    const currentVerification = await resolveCurrentSessionVerification(this.prisma, session);
    const documents =
      currentVerification && session.companyId
        ? await this.documents.listDocumentsForSession(session.companyId, currentVerification.id)
        : [];

    const dto = {
      sessionId: session.id,
      companyId: session.companyId,
      onboardingStatus: session.onboardingStatus,
      verificationStatus: session.company?.verificationStatus ?? null,
      verificationReason:
        session.onboardingStatus === 'RESUBMISSION_ALLOWED'
          ? (session.company?.verificationReason ?? null)
          : null,
      profile: draft.profile ?? {},
      representative: {
        ...(session.representativeSnapshot as object),
        workEmail: session.representativeEmail,
      },
      verification: draft.verification ?? {},
      documents,
      updatedAt: session.updatedAt.toISOString(),
    };
    return CompanyOnboardingSessionDtoSchema.parse(dto);
  }
}
