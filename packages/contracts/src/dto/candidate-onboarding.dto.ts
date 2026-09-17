import { z } from 'zod';
import { InterestDomainSchema } from '../domain/enums.js';
import { SkillDiscoverySchema, SocialVerificationSchema } from './candidate-social.dto.js';

/**
 * CN-T01 — candidate onboarding completion payload.
 *
 * Progressive onboarding model: completion means the student has entered SMART
 * with a broad interest domain and minimum identity/contact fields — not that
 * they finished their professional profile, declared skills, or enrolled in a
 * certification track.
 *
 * Persisted server-side on the user row. Completing onboarding requires DPDP
 * consent (`dpdpConsent: true`) and flips `AuthenticatedUser.onboardingCompleted`.
 *
 * Career track enrollment (`primaryTrack` / `TECH_FULLSTACK`, etc.) is out of
 * scope for this payload — see `EnrollTrackRequest` in `auth.dto.ts`.
 */

/** Human-readable labels for interest-domain pickers (onboarding + profile). */
export const INTEREST_DOMAIN_LABELS: Readonly<
  Record<z.infer<typeof InterestDomainSchema>, string>
> = {
  CS_IT: 'CS & IT',
  BUSINESS_MANAGEMENT: 'Business & Management',
  FINANCE: 'Finance',
  OTHER: 'Other',
} as const;

export const CandidateOnboardingEducationSchema = z.object({
  institutionName: z.string().min(1).max(200),
  degree: z.string().max(120).optional(),
  fieldOfStudy: z.string().max(120).optional(),
  startDate: z.string().max(32).optional(),
  endDate: z.string().max(32).optional(),
  current: z.boolean().optional(),
  grade: z.string().max(40).optional(),
});
export type CandidateOnboardingEducation = z.infer<typeof CandidateOnboardingEducationSchema>;

export const CandidateOnboardingExperienceSchema = z.object({
  role: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  location: z.string().max(120).optional(),
  startDate: z.string().max(32).optional(),
  endDate: z.string().max(32).optional(),
  description: z.string().max(4000).optional(),
  tags: z.array(z.string().max(100)).max(20).default([]),
});
export type CandidateOnboardingExperience = z.infer<typeof CandidateOnboardingExperienceSchema>;

export const CandidateOnboardingSkillSchema = z.object({
  type: z.enum(['technical', 'language']),
  name: z.string().min(1).max(80),
  proficiency: z.string().min(1).max(40),
});
export type CandidateOnboardingSkill = z.infer<typeof CandidateOnboardingSkillSchema>;

/**
 * S6-VV-75 — CGPA/10th/12th scores. Denormalized onto `User` (not
 * `CandidateEducation`) since matching needs a single indexable value per
 * student; all optional to preserve the progressive-onboarding model.
 */
export const CandidateAcademicScoresSchema = z.object({
  cgpa: z.number().min(0).max(10).optional(),
  sscPercentage: z.number().min(0).max(100).optional(),
  hscPercentage: z.number().min(0).max(100).optional(),
  /** Active academic backlog at time of profile update. */
  hasActiveBacklog: z.boolean().optional(),
});
export type CandidateAcademicScores = z.infer<typeof CandidateAcademicScoresSchema>;

export const WORK_MODES = ['FULL_TIME', 'PART_TIME', 'REMOTE', 'HYBRID'] as const;
export const WorkModeSchema = z.enum(WORK_MODES);
export type WorkMode = z.infer<typeof WorkModeSchema>;

/** Job-matching preferences — progressive profile; optional at onboarding completion. */
/** Short professional summary — progressive profile field (optional at onboarding). */
export const CandidateAboutSchema = z.string().max(4000);

/** Stored resume metadata once a candidate uploads from profile. */
export const CandidateResumeFileSchema = z.object({
  fileName: z.string().min(1).max(255),
  objectKey: z.string().min(1).max(512),
  mimeType: z.string().min(1).max(120),
  fileSizeBytes: z.number().int().positive(),
  uploadedAt: z.string().datetime(),
  lastParsedAt: z.string().datetime().nullable().optional(),
});
export type CandidateResumeFile = z.infer<typeof CandidateResumeFileSchema>;

export const CandidateOnboardingJobPreferencesSchema = z.object({
  /** Lakhs per annum. Optional — not every candidate has a current job. */
  currentCtcLakhs: z.number().positive().max(1000).optional(),
  expectedCtcLakhs: z.number().positive().max(1000),
  currentLocation: z.string().min(1).max(100),
  preferredLocations: z.array(z.string().min(1).max(100)).min(1).max(3),
  preferredWorkModes: z.array(WorkModeSchema).default(['FULL_TIME', 'HYBRID']),
});
export type CandidateOnboardingJobPreferences = z.infer<
  typeof CandidateOnboardingJobPreferencesSchema
>;

/**
 * Minimum fields that unlock platform entry (`onboardingCompleted=true`).
 * Everything else on {@link CompleteCandidateOnboardingRequestSchema} is
 * progressive profile data and may be omitted at completion time.
 */
export const CompleteCandidateOnboardingRequestSchema = z.object({
  /** Broad area-of-interest — not a certification track or career role. */
  interestDomain: InterestDomainSchema,
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  gender: z.string().max(40).optional(),
  dateOfBirth: z.string().max(32).optional(),
  phoneCountryCode: z.string().min(1).max(8),
  phoneNumber: z.string().min(1).max(32),
  /** Progressive profile — optional at onboarding completion. */
  about: CandidateAboutSchema.optional(),
  linkedinUrl: z.union([z.url(), z.literal('')]).optional(),
  githubUrl: z.union([z.url(), z.literal('')]).optional(),
  resumeFile: CandidateResumeFileSchema.optional(),
  education: z.array(CandidateOnboardingEducationSchema).max(20).default([]),
  experiences: z.array(CandidateOnboardingExperienceSchema).max(30).default([]),
  /** Progressive profile — optional at onboarding completion; must not gate entry. */
  skills: z.array(CandidateOnboardingSkillSchema).max(40).default([]),
  /** Progressive profile — optional at onboarding completion. */
  jobPreferences: CandidateOnboardingJobPreferencesSchema.optional(),
  /** Progressive profile — optional at onboarding completion. */
  academicScores: CandidateAcademicScoresSchema.optional(),
  socialVerification: SocialVerificationSchema.optional(),
  skillDiscovery: SkillDiscoverySchema.optional(),
  /** DPDP consent must be explicitly accepted to complete onboarding. */
  dpdpConsent: z.literal(true),
});
export type CompleteCandidateOnboardingRequest = z.infer<
  typeof CompleteCandidateOnboardingRequestSchema
>;

export const CandidateOnboardingProfileSchema = CompleteCandidateOnboardingRequestSchema.extend({
  dpdpConsentAt: z.string().datetime(),
  completedAt: z.string().datetime(),
});
export type CandidateOnboardingProfile = z.infer<typeof CandidateOnboardingProfileSchema>;

/**
 * In-progress onboarding data. Every field is optional and unvalidated beyond
 * size limits — the candidate is mid-entry, so nothing here needs to satisfy
 * `CompleteCandidateOnboardingRequestSchema` yet. Saving a draft never sets
 * `onboardingCompleted`.
 */
export const CandidateOnboardingDraftSchema = z.object({
  interestDomain: InterestDomainSchema.optional(),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  gender: z.string().max(40).optional(),
  dateOfBirth: z.string().max(32).optional(),
  phoneCountryCode: z.string().max(8).optional(),
  phoneNumber: z.string().max(32).optional(),
  about: CandidateAboutSchema.optional(),
  linkedinUrl: z.string().max(2048).optional(),
  githubUrl: z.string().max(2048).optional(),
  resumeFile: CandidateResumeFileSchema.optional(),
  education: z.array(CandidateOnboardingEducationSchema.partial()).max(20).optional(),
  experiences: z.array(CandidateOnboardingExperienceSchema.partial()).max(30).optional(),
  skills: z.array(CandidateOnboardingSkillSchema.partial()).max(40).optional(),
  jobPreferences: CandidateOnboardingJobPreferencesSchema.partial().optional(),
  academicScores: CandidateAcademicScoresSchema.partial().optional(),
  socialVerification: SocialVerificationSchema.optional(),
  skillDiscovery: SkillDiscoverySchema.optional(),
  dpdpConsent: z.boolean().optional(),
  savedAt: z.string().datetime().optional(),
});
export type CandidateOnboardingDraft = z.infer<typeof CandidateOnboardingDraftSchema>;

export const SaveCandidateOnboardingDraftRequestSchema = CandidateOnboardingDraftSchema.omit({
  savedAt: true,
});
export type SaveCandidateOnboardingDraftRequest = z.infer<
  typeof SaveCandidateOnboardingDraftRequestSchema
>;

export const UploadProfilePhotoResponseSchema = z.object({
  profilePhotoUrl: z.string().url(),
});
export type UploadProfilePhotoResponse = z.infer<typeof UploadProfilePhotoResponseSchema>;

export const CandidateOnboardingProfileResponseSchema = z.object({
  profile: CandidateOnboardingProfileSchema.nullable(),
  /** Persisted in-progress data, present only while onboarding is incomplete. */
  draft: CandidateOnboardingDraftSchema.nullable(),
  onboardingCompleted: z.boolean(),
  /** Resolved from the user row when a profile photo has been uploaded. */
  profilePhotoUrl: z.string().url().nullable(),
});
export type CandidateOnboardingProfileResponse = z.infer<
  typeof CandidateOnboardingProfileResponseSchema
>;

/** Browser geolocation coords — ephemeral; only city name is persisted. */
export const ReverseGeocodeRequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type ReverseGeocodeRequest = z.infer<typeof ReverseGeocodeRequestSchema>;

export const ReverseGeocodeResponseSchema = z.object({
  city: z.string().min(1).max(100),
});
export type ReverseGeocodeResponse = z.infer<typeof ReverseGeocodeResponseSchema>;
