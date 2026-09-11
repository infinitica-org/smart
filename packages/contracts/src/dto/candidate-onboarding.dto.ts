import { z } from 'zod';
import { SkillDiscoverySchema, SocialVerificationSchema } from './candidate-social.dto.js';

/**
 * CN-T01 — candidate onboarding completion payload.
 *
 * Persisted server-side on the user row. Completing onboarding requires DPDP
 * consent (`dpdpConsent: true`) and flips `AuthenticatedUser.onboardingCompleted`.
 */

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

export const WORK_MODES = ['FULL_TIME', 'PART_TIME', 'REMOTE', 'HYBRID'] as const;
export const WorkModeSchema = z.enum(WORK_MODES);
export type WorkMode = z.infer<typeof WorkModeSchema>;

/** CN-T01 — job-matching preferences captured at the end of onboarding. */
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

export const CompleteCandidateOnboardingRequestSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  gender: z.string().max(40).optional(),
  dateOfBirth: z.string().max(32).optional(),
  phoneCountryCode: z.string().min(1).max(8),
  phoneNumber: z.string().min(1).max(32),
  linkedinUrl: z.union([z.url(), z.literal('')]),
  /** Optional — not every candidate has a public GitHub profile. */
  githubUrl: z.union([z.url(), z.literal('')]).optional(),
  education: z.array(CandidateOnboardingEducationSchema).max(20).default([]),
  experiences: z.array(CandidateOnboardingExperienceSchema).max(30).default([]),
  skills: z.array(CandidateOnboardingSkillSchema).max(40).default([]),
  jobPreferences: CandidateOnboardingJobPreferencesSchema,
  /**
   * LinkedIn/GitHub identity confirmation + GitHub-derived skill suggestions.
   * Purely a trust/UX signal — optional even on completion, since GitHub
   * itself is optional and LinkedIn OIDC verification is never a hard gate.
   */
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
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  gender: z.string().max(40).optional(),
  dateOfBirth: z.string().max(32).optional(),
  phoneCountryCode: z.string().max(8).optional(),
  phoneNumber: z.string().max(32).optional(),
  linkedinUrl: z.string().max(2048).optional(),
  githubUrl: z.string().max(2048).optional(),
  education: z.array(CandidateOnboardingEducationSchema.partial()).max(20).optional(),
  experiences: z.array(CandidateOnboardingExperienceSchema.partial()).max(30).optional(),
  skills: z.array(CandidateOnboardingSkillSchema.partial()).max(40).optional(),
  jobPreferences: CandidateOnboardingJobPreferencesSchema.partial().optional(),
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

export const CandidateOnboardingProfileResponseSchema = z.object({
  profile: CandidateOnboardingProfileSchema.nullable(),
  /** Persisted in-progress data, present only while onboarding is incomplete. */
  draft: CandidateOnboardingDraftSchema.nullable(),
  onboardingCompleted: z.boolean(),
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
