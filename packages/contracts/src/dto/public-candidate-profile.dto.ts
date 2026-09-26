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
  /** CN-T09 — true for a not-yet-VERIFIED entry, only ever present when `showInProgressItems` is on. */
  inProgress: z.boolean().default(false),
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
  /** CN-T09 — true for a not-yet-VERIFIED certificate, only ever present when `showInProgressItems` is on. */
  inProgress: z.boolean().default(false),
});
export type PublicExternalCertificate = z.infer<typeof PublicExternalCertificateSchema>;

export const PublicCompetencyEvidenceSummarySchema = z.object({
  skillCode: z.string().nullable(),
  capabilityLabel: z.string(),
  proficiency: z.string(),
  confidenceScore: z.number().min(0).max(1),
  evidenceSnippets: z.array(z.string().max(500)).max(5),
});
export type PublicCompetencyEvidenceSummary = z.infer<typeof PublicCompetencyEvidenceSummarySchema>;

export const PublicEducationSchema = z.object({
  institutionName: z.string(),
  degree: z.string().nullable(),
  fieldOfStudy: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  current: z.boolean(),
  grade: z.string().nullable(),
});
export type PublicEducation = z.infer<typeof PublicEducationSchema>;

export const PublicCandidateProfileDtoSchema = z.object({
  fullName: z.string(),
  /** Signed download URL for the candidate profile photo, when uploaded. */
  profilePhotoUrl: z.string().url().nullable(),
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
  /** College-confirmed education entries when present. */
  education: z.array(PublicEducationSchema).default([]),
  competencyEvidenceSummaries: z.array(PublicCompetencyEvidenceSummarySchema).default([]),
  /** CN-T09 — echoes the owner's opt-in state so the frontend can label in-progress entries. */
  showInProgressItems: z.boolean().default(false),
  /** T6 — list of sections hidden by student section privacy settings. */
  hiddenSections: z.array(z.string()).default([]),
  /** T10 — latest committed change timestamp relevant to the candidate profile. */
  lastUpdatedAt: z.string().optional(),
  /** STU-02 — false when the student has turned employer messages off. */
  acceptsEmployerMessages: z.boolean().default(true),
});
export type PublicCandidateProfileDto = z.infer<typeof PublicCandidateProfileDtoSchema>;

export const PublicProfileLinkResponseSchema = z.object({
  slug: z.string(),
  url: z.string(),
});
export type PublicProfileLinkResponse = z.infer<typeof PublicProfileLinkResponseSchema>;

/**
 * CN-T07 — generates LinkedIn "Add certification" deep link URL for eligible certifications.
 * Pure deep-link helper — no OAuth, account connection, or posting.
 */
export function buildLinkedInAddCertificationUrl(params: {
  name: string;
  organizationName?: string;
  issueYear?: number | string;
  issueMonth?: number | string;
  certUrl?: string;
  certId?: string;
}): string {
  const url = new URL('https://www.linkedin.com/profile/add');
  url.searchParams.set('startTask', 'CERTIFICATION_NAME');
  url.searchParams.set('name', params.name);
  if (params.organizationName) {
    url.searchParams.set('organizationName', params.organizationName);
  }
  if (params.issueYear) {
    url.searchParams.set('issueYear', String(params.issueYear));
  }
  if (params.issueMonth) {
    url.searchParams.set('issueMonth', String(params.issueMonth));
  }
  if (params.certUrl) {
    url.searchParams.set('certUrl', params.certUrl);
  }
  if (params.certId) {
    url.searchParams.set('certId', params.certId);
  }
  return url.toString();
}
