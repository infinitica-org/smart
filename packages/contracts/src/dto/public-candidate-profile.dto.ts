import { z } from 'zod';
import {
  CertifiableTierSchema,
  CertificateProficiencySchema,
  CertificateVerificationMethodSchema,
  EmploymentTypeSchema,
  ProjectStatusSchema,
  SkillProficiencySchema,
} from '../domain/enums.js';
import { ScoreSchema } from './common.js';

/**
 * CN-T?? — the public, unauthenticated "know the candidate in one shot" profile.
 * Only ever built from real, already-verified data (verified skills, verified
 * work experience, submitted projects, an issued certificate) — never from
 * self-declared/unverified claims, since this is what an employer sees with no
 * login and no way to cross-check anything themselves.
 */

export const PublicSkillSchema = z.object({
  skillCode: z.string(),
  skillName: z.string(),
  proficiency: SkillProficiencySchema,
});
export type PublicSkill = z.infer<typeof PublicSkillSchema>;

export const PublicProjectSchema = z.object({
  projectId: z.string(),
  title: z.string(),
  outcome: z.string(),
  stack: z.string(),
  githubUrl: z.string().nullable(),
  liveUrl: z.string().nullable(),
  status: ProjectStatusSchema,
  /** Only present once verification has actually scored the project. */
  score: ScoreSchema.nullable(),
});
export type PublicProject = z.infer<typeof PublicProjectSchema>;

export const PublicWorkExperienceSchema = z.object({
  companyName: z.string(),
  role: z.string(),
  employmentType: EmploymentTypeSchema,
  startDate: z.string(),
  endDate: z.string().nullable(),
  isCurrent: z.boolean(),
});
export type PublicWorkExperience = z.infer<typeof PublicWorkExperienceSchema>;

export const PublicCertificateSchema = z.object({
  trackName: z.string(),
  tier: CertifiableTierSchema,
});
export type PublicCertificate = z.infer<typeof PublicCertificateSchema>;

/** An externally-issued certificate (AWS, Coursera, etc.) verified via endorsement or LLM — distinct from SMART's own issued `certificate` above. */
export const PublicExternalCertificateSchema = z.object({
  title: z.string(),
  issuer: z.string(),
  verificationMethod: CertificateVerificationMethodSchema.nullable(),
  skills: z.array(
    z.object({
      skillName: z.string(),
      proficiency: CertificateProficiencySchema,
    }),
  ),
});
export type PublicExternalCertificate = z.infer<typeof PublicExternalCertificateSchema>;

export const PublicCandidateProfileDtoSchema = z.object({
  fullName: z.string(),
  trackName: z.string().nullable(),
  trackCategory: z.enum(['TECH', 'MBA']).nullable(),
  /** VERIFIED skill claims only — a public profile shows proof, not self-declarations. */
  skills: z.array(PublicSkillSchema),
  declaredSkillsCount: z.number().int().min(0),
  projects: z.array(PublicProjectSchema),
  /** VERIFIED work-experience entries only (employer-confirmed). */
  workExperience: z.array(PublicWorkExperienceSchema),
  certificate: PublicCertificateSchema.nullable(),
  /** Only VERIFIED externally-issued certificates — same proof-not-declaration rule as everything else here. */
  externalCertificates: z.array(PublicExternalCertificateSchema),
});
export type PublicCandidateProfileDto = z.infer<typeof PublicCandidateProfileDtoSchema>;

export const PublicProfileLinkResponseSchema = z.object({
  slug: z.string(),
  url: z.string(),
});
export type PublicProfileLinkResponse = z.infer<typeof PublicProfileLinkResponseSchema>;
