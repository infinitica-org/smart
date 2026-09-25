import { z } from 'zod';
import {
  CompanyModeSchema,
  CompanyOnboardingStatusSchema,
  CompanyVerificationDocumentReviewStatusSchema,
  CompanyVerificationDocumentTypeSchema,
  RepresentativeRelationshipSchema,
  TenantVerificationStatusSchema,
} from '../domain/enums.js';
import { isFreeMailDomain } from '../domain/disallowed-email-domains.js';
import { EmailSchema, IsoDateTimeSchema, UuidSchema } from './common.js';

/**
 * Company self-onboarding contracts (B2B tenant intake).
 * Implementation owner: Vishal V (`institutions` / future onboarding module).
 * Does not replace `PlacementEmployer` (TPO repository) or `Organization` identity graph.
 */

/** ISO 3166-1 alpha-2 (uppercase). */
export const CountryCodeSchema = z
  .string()
  .trim()
  .length(2)
  .regex(/^[A-Z]{2}$/, 'Expected ISO 3166-1 alpha-2 country code');

export const MAX_COMPANY_VERIFICATION_DOCUMENT_BYTES = 5 * 1024 * 1024;

/** Employee-count bands a company can choose from during onboarding. */
export const COMPANY_SIZE_BANDS = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1001-5000',
  '5001+',
] as const;
export type CompanySizeBand = (typeof COMPANY_SIZE_BANDS)[number];
export const CompanySizeBandSchema = z.enum(COMPANY_SIZE_BANDS, {
  message: 'Choose a company size from the list.',
});

export const COMPANY_SIZE_BAND_LABELS: Record<CompanySizeBand, string> = {
  '1-10': '1–10 employees',
  '11-50': '11–50 employees',
  '51-200': '51–200 employees',
  '201-500': '201–500 employees',
  '501-1000': '501–1,000 employees',
  '1001-5000': '1,001–5,000 employees',
  '5001+': '5,001+ employees',
};

/** Digits only (8 to 15), with an optional leading +. Spaces and dashes are not accepted. */
export const CompanyPhoneSchema = z
  .string()
  .trim()
  .regex(
    /^\+?[0-9]{8,15}$/,
    'Enter a valid phone number: digits only, 8 to 15 digits, with an optional leading +.',
  );

export const COMPANY_WORK_EMAIL_REQUIRED_MESSAGE =
  'Use your company email address. Personal addresses (e.g. Gmail, Yahoo, Outlook) are not accepted.';

/** A company representative must sign up from a company mailbox, never a free-mail one. */
export const CompanyWorkEmailSchema = EmailSchema.refine((email) => !isFreeMailDomain(email), {
  message: COMPANY_WORK_EMAIL_REQUIRED_MESSAGE,
});

export const CompanyRepresentativeSchema = z.object({
  fullName: z.string().trim().min(2).max(200),
  workEmail: CompanyWorkEmailSchema,
  phone: CompanyPhoneSchema,
  jobTitle: z.string().trim().min(1).max(120),
  department: z.string().trim().max(120).optional(),
  relationship: RepresentativeRelationshipSchema,
});
export type CompanyRepresentative = z.infer<typeof CompanyRepresentativeSchema>;

export const CompanyAddressSchema = z.object({
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(120),
  stateProvince: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().max(32).optional(),
  country: CountryCodeSchema,
});
export type CompanyAddress = z.infer<typeof CompanyAddressSchema>;

/** Public-facing company profile during onboarding (maps to `Company` + verification snapshot). */
export const CompanySignupProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(200),
  legalName: z.string().trim().min(2).max(200),
  website: z.string().trim().url().max(255),
  linkedinUrl: z.string().trim().url().max(255).optional(),
  sector: z.string().trim().min(1).max(80),
  /** Industry taxonomy (SA-09) — not the unique `Company.domain` slug. */
  taxonomyDomain: z.string().trim().min(1).max(80).optional(),
  mode: CompanyModeSchema,
  sizeBand: CompanySizeBandSchema,
  publicPhone: z.union([CompanyPhoneSchema, z.literal('')]).optional(),
  publicEmail: EmailSchema,
  description: z.string().trim().max(5000).optional(),
  address: CompanyAddressSchema,
});
export type CompanySignupProfile = z.infer<typeof CompanySignupProfileSchema>;

export const CompanyVerificationSchema = z.object({
  registrationCountry: CountryCodeSchema,
  jurisdictionCode: z.string().trim().max(16).optional(),
  legalName: z.string().trim().min(2).max(200),
  registeredAddress: CompanyAddressSchema,
  businessRegistrationNumber: z.string().trim().max(64).optional(),
  taxId: z.string().trim().max(64).optional(),
  registrationAuthority: z.string().trim().max(120).optional(),
});
export type CompanyVerification = z.infer<typeof CompanyVerificationSchema>;

export const CompanyVerificationDocumentSchema = z.object({
  documentId: UuidSchema,
  companyId: UuidSchema,
  submissionId: UuidSchema,
  documentType: CompanyVerificationDocumentTypeSchema,
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(127),
  fileSizeBytes: z.number().int().positive().max(MAX_COMPANY_VERIFICATION_DOCUMENT_BYTES),
  /** Object storage key — signed download URLs are minted at read time. */
  storageKey: z.string().trim().min(1).max(512),
  uploadedAt: IsoDateTimeSchema,
  reviewStatus: CompanyVerificationDocumentReviewStatusSchema,
  reviewReason: z.string().trim().max(500).nullable(),
});
export type CompanyVerificationDocument = z.infer<typeof CompanyVerificationDocumentSchema>;

/** Public onboarding API — no raw storageKey; optional short-lived download URL. */
export const CompanyOnboardingVerificationDocumentDtoSchema =
  CompanyVerificationDocumentSchema.omit({ storageKey: true }).extend({
    downloadUrl: z.string().url().optional(),
  });
export type CompanyOnboardingVerificationDocumentDto = z.infer<
  typeof CompanyOnboardingVerificationDocumentDtoSchema
>;

export const StartCompanyOnboardingRequestSchema = z.object({
  representative: CompanyRepresentativeSchema.pick({ fullName: true, workEmail: true }),
  website: z.string().trim().url().max(255).optional(),
});
export type StartCompanyOnboardingRequest = z.infer<typeof StartCompanyOnboardingRequestSchema>;

/** Opaque onboarding credential — not a JWT access token. */
export const StartCompanyOnboardingResponseSchema = z.object({
  sessionToken: z.string().min(32).max(512),
  expiresAt: IsoDateTimeSchema,
  onboardingStatus: CompanyOnboardingStatusSchema,
});
export type StartCompanyOnboardingResponse = z.infer<typeof StartCompanyOnboardingResponseSchema>;

export const UpdateCompanyOnboardingDraftRequestSchema = z
  .object({
    profile: CompanySignupProfileSchema.partial().optional(),
    representative: CompanyRepresentativeSchema.partial().optional(),
    verification: CompanyVerificationSchema.partial().optional(),
  })
  .refine(
    (body) =>
      body.profile !== undefined ||
      body.representative !== undefined ||
      body.verification !== undefined,
    { message: 'At least one of profile, representative, or verification must be provided.' },
  );
export type UpdateCompanyOnboardingDraftRequest = z.infer<
  typeof UpdateCompanyOnboardingDraftRequestSchema
>;

export const CompanyOnboardingSessionDtoSchema = z.object({
  sessionId: UuidSchema,
  companyId: UuidSchema.nullable(),
  onboardingStatus: CompanyOnboardingStatusSchema,
  verificationStatus: TenantVerificationStatusSchema.nullable(),
  profile: CompanySignupProfileSchema.partial(),
  representative: CompanyRepresentativeSchema.partial(),
  verification: CompanyVerificationSchema.partial(),
  documents: z.array(CompanyOnboardingVerificationDocumentDtoSchema),
  updatedAt: IsoDateTimeSchema,
});
export type CompanyOnboardingSessionDto = z.infer<typeof CompanyOnboardingSessionDtoSchema>;

export const SendCorporateEmailVerificationRequestSchema = z.object({});
export type SendCorporateEmailVerificationRequest = z.infer<
  typeof SendCorporateEmailVerificationRequestSchema
>;

export const SendCorporateEmailVerificationResponseSchema = z.object({
  expiresAt: IsoDateTimeSchema,
  resendAvailableAt: IsoDateTimeSchema,
});
export type SendCorporateEmailVerificationResponse = z.infer<
  typeof SendCorporateEmailVerificationResponseSchema
>;

export const VerifyCorporateEmailRequestSchema = z.object({
  code: z.string().trim().min(4).max(12),
});
export type VerifyCorporateEmailRequest = z.infer<typeof VerifyCorporateEmailRequestSchema>;

export const VerifyCorporateEmailResponseSchema = z.object({
  onboardingStatus: CompanyOnboardingStatusSchema,
  emailVerified: z.literal(true),
});
export type VerifyCorporateEmailResponse = z.infer<typeof VerifyCorporateEmailResponseSchema>;

export const CompanyDocumentUploadMetaSchema = z.object({
  documentType: CompanyVerificationDocumentTypeSchema,
});
export type CompanyDocumentUploadMeta = z.infer<typeof CompanyDocumentUploadMetaSchema>;

export const SubmitCompanyOnboardingRequestSchema = z.object({
  attestations: z.object({
    authorizedToRepresent: z.literal(true),
    informationAccurate: z.literal(true),
  }),
});
export type SubmitCompanyOnboardingRequest = z.infer<typeof SubmitCompanyOnboardingRequestSchema>;

export const SubmitCompanyOnboardingResponseSchema = z.object({
  companyId: UuidSchema,
  onboardingStatus: CompanyOnboardingStatusSchema,
  verificationStatus: TenantVerificationStatusSchema,
  submittedAt: IsoDateTimeSchema,
});
export type SubmitCompanyOnboardingResponse = z.infer<typeof SubmitCompanyOnboardingResponseSchema>;

export const CompanyVerificationReviewDocumentSchema = z.object({
  documentId: UuidSchema,
  reviewStatus: z.enum(['ACCEPTED', 'REJECTED']),
  reviewReason: z.string().trim().max(500).optional(),
});
export type CompanyVerificationReviewDocument = z.infer<
  typeof CompanyVerificationReviewDocumentSchema
>;
