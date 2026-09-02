import { z } from 'zod';
import {
  GithubSnapshotUnavailableReasonSchema,
  ProjectStatusSchema,
  ProjectVerifyFlagSchema,
} from '../domain/enums.js';
import { IsoDateTimeSchema, ScoreSchema, UuidSchema } from './common.js';

/**
 * SE-T03 / CN-T08 contracts.
 *
 * Vishal V: GitHub OAuth (repo-read, not login-only), snapshot job, Prisma JSON
 * table `project_github_snapshots`, Redis `github:repos:{userId}` +
 * `project:snapshot:{projectId}` locks. Ramansh consumes `ProjectGithubSnapshot`
 * only — never Octokit. The agent never sets status REJECTED.
 *
 * Owner of this file: Tino (contracts). Implementers: VV / RM / VB / SV.
 */

export const PROJECT_VERIFY_PROMPT_REF = 'project-verify@1' as const;

export const PROJECT_VERIFY_WEIGHTS = {
  relevance: 0.4,
  quality: 0.4,
  originality: 0.2,
} as const;

export const PROJECT_VERIFY_CONFIDENCE_AUTO = 0.7;
export const PROJECT_VERIFY_DUPLICATE_FLAG = 0.65;
export const PROJECT_VERIFY_DUPLICATE_REVIEW = 0.4;
export const PROJECT_VERIFY_TECH_AGE_YEARS = 3;
export const PROJECT_VERIFY_README_MAX_CHARS = 20_000;
export const PROJECT_VERIFY_TREE_MAX_ENTRIES = 200;
export const PROJECT_VERIFY_COMMIT_MAX = 20;
export const PROJECT_VERIFY_REPO_MAX = 3;

export const GithubRepoRefSchema = z.object({
  owner: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  htmlUrl: z.url(),
  defaultBranch: z.string().min(1).max(200),
  isPrivate: z.boolean(),
  githubRepoId: z.number().int().positive(),
});
export type GithubRepoRef = z.infer<typeof GithubRepoRefSchema>;

export const GithubTreeEntrySchema = z.object({
  path: z.string().min(1).max(500),
  type: z.enum(['file', 'dir']),
  size: z.number().int().nonnegative().optional(),
});
export type GithubTreeEntry = z.infer<typeof GithubTreeEntrySchema>;

export const GithubCommitSignalSchema = z.object({
  sha: z.string().min(7).max(64),
  authorLogin: z.string().max(100).optional(),
  authorName: z.string().max(200).optional(),
  committedAt: IsoDateTimeSchema,
  message: z.string().max(500),
});
export type GithubCommitSignal = z.infer<typeof GithubCommitSignalSchema>;

export const GithubDetectedFilesSchema = z.object({
  hasPackageJson: z.boolean(),
  hasPyproject: z.boolean(),
  hasDockerfile: z.boolean(),
  hasCiConfig: z.boolean(),
  hasLockfile: z.boolean(),
  hasTestsDir: z.boolean(),
});
export type GithubDetectedFiles = z.infer<typeof GithubDetectedFilesSchema>;

export const GithubRepoSnapshotSchema = GithubRepoRefSchema.extend({
  fetchedAt: IsoDateTimeSchema,
  githubRateRemaining: z.number().int().nonnegative().optional(),
  description: z.string().max(2_000).nullable(),
  primaryLanguage: z.string().max(80).nullable(),
  languages: z.record(z.string(), z.number()),
  topics: z.array(z.string().max(80)).max(30),
  licenseSpdx: z.string().max(80).nullable(),
  createdAt: IsoDateTimeSchema,
  pushedAt: IsoDateTimeSchema,
  stargazersCount: z.number().int().nonnegative(),
  forksCount: z.number().int().nonnegative(),
  isFork: z.boolean(),
  parentFullName: z.string().max(200).nullable(),
  openIssuesCount: z.number().int().nonnegative(),
  archived: z.boolean(),
  readmePath: z.string().max(400).nullable(),
  readmeMarkdown: z.string().max(PROJECT_VERIFY_README_MAX_CHARS),
  readmeSha: z.string().max(64).nullable(),
  readmeTruncated: z.boolean(),
  rootEntries: z.array(GithubTreeEntrySchema).max(PROJECT_VERIFY_TREE_MAX_ENTRIES),
  detectedFiles: GithubDetectedFilesSchema,
  recentCommits: z.array(GithubCommitSignalSchema).max(PROJECT_VERIFY_COMMIT_MAX),
  commitCountApprox: z.number().int().nonnegative().optional(),
  uniqueAuthorLogins: z.array(z.string().max(100)).max(20),
  commitSpanDays: z.number().int().nonnegative().nullable(),
  ok: z.boolean(),
  unavailableReason: GithubSnapshotUnavailableReasonSchema.optional(),
});
export type GithubRepoSnapshot = z.infer<typeof GithubRepoSnapshotSchema>;

export const ProjectGithubSnapshotSchema = z.object({
  projectId: UuidSchema,
  studentId: UuidSchema,
  snapshotVersion: z.number().int().positive(),
  repos: z.array(GithubRepoSnapshotSchema).max(PROJECT_VERIFY_REPO_MAX),
});
export type ProjectGithubSnapshot = z.infer<typeof ProjectGithubSnapshotSchema>;

export const GithubPickerRepoSchema = z.object({
  githubRepoId: z.number().int().positive(),
  fullName: z.string().min(3).max(200),
  description: z.string().max(500).nullable(),
  language: z.string().max(80).nullable(),
  pushedAt: IsoDateTimeSchema,
  stars: z.number().int().nonnegative(),
  isPrivate: z.boolean(),
  htmlUrl: z.url(),
  owner: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  defaultBranch: z.string().min(1).max(200),
});
export type GithubPickerRepo = z.infer<typeof GithubPickerRepoSchema>;

export const GithubConnectionStatusDtoSchema = z.object({
  connected: z.boolean(),
  githubLogin: z.string().max(100).nullable(),
  scopes: z.array(z.string()).max(20),
});
export type GithubConnectionStatusDto = z.infer<typeof GithubConnectionStatusDtoSchema>;

export const GithubRepoListDtoSchema = z.object({
  connected: z.boolean(),
  repos: z.array(GithubPickerRepoSchema).max(20),
});
export type GithubRepoListDto = z.infer<typeof GithubRepoListDtoSchema>;

export const CreateProjectRequestSchema = z.object({
  title: z.string().min(3).max(200),
  problem: z.string().min(20).max(8_000),
  approach: z.string().min(20).max(8_000),
  stack: z.string().min(2).max(1_000),
  outcome: z.string().min(20).max(8_000),
  loomUrl: z.url().optional(),
  githubRepos: z.array(GithubRepoRefSchema).max(PROJECT_VERIFY_REPO_MAX).default([]),
});
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;

export const ProjectVerifyLlmOutputSchema = z.object({
  relevanceScore: ScoreSchema,
  qualityScore: ScoreSchema,
  confidence: z.number().min(0).max(1),
  explanation: z.string().min(20).max(4_000),
  evidence: z.array(z.string().max(500)).max(10),
  gaps: z.array(z.string().max(500)).max(10),
});
export type ProjectVerifyLlmOutput = z.infer<typeof ProjectVerifyLlmOutputSchema>;

export const ProjectVerificationReportDtoSchema = z.object({
  reportId: UuidSchema,
  projectId: UuidSchema,
  score: ScoreSchema,
  relevanceScore: ScoreSchema,
  qualityScore: ScoreSchema,
  duplicateScore: ScoreSchema,
  confidence: z.number().min(0).max(1),
  plagiarismFlag: z.boolean(),
  techAgeFlag: z.boolean(),
  flags: z.array(ProjectVerifyFlagSchema).max(10),
  explanation: z.string().min(1).max(4_000),
  routedToReview: z.boolean(),
  promptRef: z.string().regex(/^[a-z0-9-]+@\d+$/),
  auditId: UuidSchema.nullable(),
  createdAt: IsoDateTimeSchema,
});
export type ProjectVerificationReportDto = z.infer<typeof ProjectVerificationReportDtoSchema>;

export const ProjectDtoSchema = z.object({
  projectId: UuidSchema,
  studentId: UuidSchema,
  title: z.string(),
  problem: z.string(),
  approach: z.string(),
  stack: z.string(),
  outcome: z.string(),
  loomUrl: z.string().nullable(),
  githubUrl: z.string().nullable(),
  status: ProjectStatusSchema,
  createdAt: IsoDateTimeSchema,
  report: ProjectVerificationReportDtoSchema.nullable(),
});
export type ProjectDto = z.infer<typeof ProjectDtoSchema>;

export const ProjectReviewQueueItemDtoSchema = z.object({
  projectId: UuidSchema,
  studentId: UuidSchema,
  studentName: z.string(),
  title: z.string(),
  status: ProjectStatusSchema,
  score: ScoreSchema.nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  flags: z.array(ProjectVerifyFlagSchema),
  routedToReview: z.boolean(),
  explanation: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
});
export type ProjectReviewQueueItemDto = z.infer<typeof ProjectReviewQueueItemDtoSchema>;

export const ResolveProjectReviewRequestSchema = z.object({
  resolution: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().min(8).max(2_000),
});
export type ResolveProjectReviewRequest = z.infer<typeof ResolveProjectReviewRequestSchema>;
