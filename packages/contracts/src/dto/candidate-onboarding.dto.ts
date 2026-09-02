import { z } from 'zod';

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

export const CompleteCandidateOnboardingRequestSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  gender: z.string().max(40).optional(),
  dateOfBirth: z.string().max(32).optional(),
  phoneCountryCode: z.string().min(1).max(8),
  phoneNumber: z.string().min(1).max(32),
  linkedinUrl: z.union([z.url(), z.literal('')]),
  education: z.array(CandidateOnboardingEducationSchema).max(20).default([]),
  experiences: z.array(CandidateOnboardingExperienceSchema).max(30).default([]),
  skills: z.array(CandidateOnboardingSkillSchema).max(40).default([]),
  preferences: z.array(z.string().min(1).max(80)).min(1).max(50),
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

export const CandidateOnboardingProfileResponseSchema = z.object({
  profile: CandidateOnboardingProfileSchema.nullable(),
  onboardingCompleted: z.boolean(),
});
export type CandidateOnboardingProfileResponse = z.infer<
  typeof CandidateOnboardingProfileResponseSchema
>;
