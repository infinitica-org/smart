import { z } from 'zod';

/**
 * CN-T01 — GitHub/LinkedIn identity verification and GitHub-derived skill
 * discovery, layered onto candidate onboarding (`candidate-onboarding.dto.ts`).
 *
 * LinkedIn has no public scraping API and scraping profile URLs violates its
 * ToS, so "verification" here means the compliant OIDC flow
 * (`GET /users/me/onboarding/linkedin/oauth-url` -> LinkedIn consent ->
 * `GET /auth/linkedin/callback`), not scraping the pasted URL. GitHub is
 * read via its public REST API (already precedented in
 * `project-verify.web-similarity.ts`), no OAuth needed since only public
 * data is read.
 *
 * Verification is a trust signal only — it never gates onboarding
 * completion. LinkedIn/GitHub URLs and everything in this file are optional
 * at onboarding completion; they remain available for progressive profile
 * building after the student enters SMART.
 */

export const LinkedinVerificationSchema = z.object({
  verified: z.boolean().default(false),
  verifiedAt: z.string().datetime().optional(),
  /** LinkedIn OIDC `sub` — stable subject id, not the profile URL. */
  providerSub: z.string().max(200).optional(),
  name: z.string().max(200).optional(),
  headline: z.string().max(300).optional(),
  pictureUrl: z.string().max(2048).optional(),
});
export type LinkedinVerification = z.infer<typeof LinkedinVerificationSchema>;

export const GithubRepoSummarySchema = z.object({
  id: z.number().int(),
  fullName: z.string().min(1).max(220),
  description: z.string().max(2000).nullable().default(null),
  htmlUrl: z.string().max(2048),
  stars: z.number().int().nonnegative().default(0),
  primaryLanguage: z.string().max(60).nullable().default(null),
  updatedAt: z.string().datetime().optional(),
});
export type GithubRepoSummary = z.infer<typeof GithubRepoSummarySchema>;

/** A repo the candidate flagged as one of their top 3-5 proudest projects. */
export const GithubRepoSelectionSchema = z.object({
  id: z.number().int(),
  fullName: z.string().min(1).max(220),
  primaryLanguage: z.string().max(60).nullable().default(null),
  stars: z.number().int().nonnegative().default(0),
});
export type GithubRepoSelection = z.infer<typeof GithubRepoSelectionSchema>;

export const GithubVerificationSchema = z.object({
  verified: z.boolean().default(false),
  verifiedAt: z.string().datetime().optional(),
  login: z.string().max(100).optional(),
  name: z.string().max(200).nullable().optional(),
  avatarUrl: z.string().max(2048).optional(),
  publicRepoCount: z.number().int().nonnegative().optional(),
  /** Top 3-5 repos the candidate is proud of. Enforced client-side; server caps at 5. */
  selectedRepos: z.array(GithubRepoSelectionSchema).max(5).default([]),
});
export type GithubVerification = z.infer<typeof GithubVerificationSchema>;

export const SocialVerificationSchema = z.object({
  linkedin: LinkedinVerificationSchema.nullable().default(null),
  github: GithubVerificationSchema.nullable().default(null),
});
export type SocialVerification = z.infer<typeof SocialVerificationSchema>;

/** One language's share across the candidate's selected repos (GitHub `languages` API, bytes-weighted). */
export const LanguageBreakdownEntrySchema = z.object({
  language: z.string().min(1).max(60),
  bytes: z.number().int().nonnegative(),
  /** 0-1 share of total bytes across the selected repos. */
  byteShare: z.number().min(0).max(1),
  repoCount: z.number().int().positive(),
});
export type LanguageBreakdownEntry = z.infer<typeof LanguageBreakdownEntrySchema>;

export const SkillDiscoverySchema = z.object({
  /** Read-only provenance the UI renders as "from N of your repos" — not user-editable. */
  suggestedFromGithub: z.array(LanguageBreakdownEntrySchema).max(20).default([]),
  /** Final chosen skill names — a subset of suggested + any of customSkillNames. */
  selectedSkillNames: z.array(z.string().min(1).max(80)).max(30).default([]),
  customSkillNames: z.array(z.string().min(1).max(80)).max(20).default([]),
});
export type SkillDiscovery = z.infer<typeof SkillDiscoverySchema>;

/* -------------------------- GitHub proxy endpoints -------------------------- */

export const FetchGithubProfileRequestSchema = z.object({
  githubUrl: z.string().min(1).max(2048),
});
export type FetchGithubProfileRequest = z.infer<typeof FetchGithubProfileRequestSchema>;

export const FetchGithubProfileResponseSchema = z.object({
  login: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string(),
  bio: z.string().nullable(),
  publicRepoCount: z.number().int().nonnegative(),
});
export type FetchGithubProfileResponse = z.infer<typeof FetchGithubProfileResponseSchema>;

export const ListGithubReposRequestSchema = z.object({
  login: z.string().min(1).max(100),
});
export type ListGithubReposRequest = z.infer<typeof ListGithubReposRequestSchema>;

export const ListGithubReposResponseSchema = z.object({
  repos: z.array(GithubRepoSummarySchema).max(100),
});
export type ListGithubReposResponse = z.infer<typeof ListGithubReposResponseSchema>;

export const RepoLanguagesRequestSchema = z.object({
  /** 3-5 repos the candidate flagged as favorites — matches GithubVerification.selectedRepos. */
  repoFullNames: z.array(z.string().min(1).max(220)).min(3).max(5),
});
export type RepoLanguagesRequest = z.infer<typeof RepoLanguagesRequestSchema>;

export const RepoLanguagesResponseSchema = z.object({
  languages: z.array(LanguageBreakdownEntrySchema).max(20),
});
export type RepoLanguagesResponse = z.infer<typeof RepoLanguagesResponseSchema>;

export const GithubRepoReadmeRequestSchema = z.object({
  /** `owner/repo` — from a `GithubRepoSummary.fullName` the candidate already has listed. */
  fullName: z.string().min(3).max(220),
});
export type GithubRepoReadmeRequest = z.infer<typeof GithubRepoReadmeRequestSchema>;

export const GithubRepoReadmeResponseSchema = z.object({
  /** Raw README markdown, or null if the repo has none / it couldn't be read. */
  readme: z.string().max(20_000).nullable(),
});
export type GithubRepoReadmeResponse = z.infer<typeof GithubRepoReadmeResponseSchema>;

/* ------------------------------ LinkedIn OIDC ------------------------------- */

export const LinkedinOauthUrlResponseSchema = z.object({
  url: z.string(),
});
export type LinkedinOauthUrlResponse = z.infer<typeof LinkedinOauthUrlResponseSchema>;
