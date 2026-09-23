import {
  PROJECT_VERIFY_PROMPT_REF,
  ProjectDtoSchema,
  ProjectReviewQueueItemDtoSchema,
  ProjectVerificationReportDtoSchema,
  type CreateProjectRequest,
  type GithubRepoSnapshot,
  type ProjectDto,
  type ProjectExclusionReason,
  type ProjectGithubSnapshot,
  type ProjectInterviewState,
  type ProjectReviewQueueItemDto,
  type ProjectVerificationReportDto,
} from '@smart/contracts';

export const REPORT_META_MARK = '\n---smart-verify---\n';

export type QlixDigestMeta = {
  similarityIndex: number;
  aiLikelihood: number | null;
  agentSummary: string;
  analyzedTokens: number;
};

export interface StoredReportMeta {
  qualityScore: number;
  duplicateScore: number;
  confidence: number;
  flags: ProjectVerificationReportDto['flags'];
  promptRef: string;
  auditId: string | null;
  qlixStatus?: 'POLLING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT';
  qlixDigest?: QlixDigestMeta;
  qlixReportDigest?: string;
  snapshotRepos?: GithubRepoSnapshot[];
  exclusionReason?: ProjectExclusionReason;
  reverifyCount?: number;
  lastReverifyAt?: string;
}

export function decodeReportMeta(explanation: string): {
  text: string;
  meta: StoredReportMeta | null;
} {
  const [text, rawMeta] = explanation.split(REPORT_META_MARK);
  if (!rawMeta) return { text: explanation, meta: null };
  try {
    return { text: text || explanation, meta: JSON.parse(rawMeta) as StoredReportMeta };
  } catch {
    return { text: text || explanation, meta: null };
  }
}

export function encodeReportExplanation(explanation: string, meta: StoredReportMeta): string {
  return `${explanation}${REPORT_META_MARK}${JSON.stringify(meta)}`;
}

export function placeholderSnapshot(
  projectId: string,
  studentId: string,
  githubRepos: CreateProjectRequest['githubRepos'],
): ProjectGithubSnapshot {
  const now = new Date().toISOString();
  const emptyRepo = (ref: CreateProjectRequest['githubRepos'][number]): GithubRepoSnapshot => ({
    ...ref,
    fetchedAt: now,
    description: null,
    primaryLanguage: null,
    languages: {},
    topics: [],
    licenseSpdx: null,
    createdAt: now,
    pushedAt: now,
    stargazersCount: 0,
    forksCount: 0,
    isFork: false,
    parentFullName: null,
    openIssuesCount: 0,
    archived: false,
    readmePath: null,
    readmeMarkdown: '',
    readmeSha: null,
    readmeTruncated: false,
    rootEntries: [],
    detectedFiles: {
      hasPackageJson: false,
      hasPyproject: false,
      hasDockerfile: false,
      hasCiConfig: false,
      hasLockfile: false,
      hasTestsDir: false,
    },
    recentCommits: [],
    uniqueAuthorLogins: [],
    commitSpanDays: null,
    ok: false,
    unavailableReason: 'oauth_missing',
  });
  return {
    projectId,
    studentId,
    snapshotVersion: 1,
    repos: githubRepos.map(emptyRepo),
  };
}

export function snapshotDigest(repos: readonly GithubRepoSnapshot[], snapshotOk: boolean): string {
  if (!snapshotOk) {
    return 'GitHub snapshot unavailable (oauth_missing or fetch failed). Score from the written template only and keep confidence low.';
  }
  return JSON.stringify(
    repos.map((repo) => ({
      fullName: `${repo.owner}/${repo.name}`,
      languages: repo.languages,
      topics: repo.topics,
      pushedAt: repo.pushedAt,
      detectedFiles: repo.detectedFiles,
      readme: repo.readmeMarkdown.slice(0, 4_000),
      commits: repo.recentCommits.map((c) => c.message),
    })),
  ).slice(0, 15_000);
}

type Decimalish = { toNumber?: () => number } | number;

export type ProjectRow = {
  id: string;
  studentId: string;
  title: string;
  problem: string;
  approach: string;
  stack: string;
  outcome: string;
  loomUrl: string | null;
  githubUrl: string | null;
  liveUrl: string | null;
  snapshotSha: string | null;
  qlixCheckId: string | null;
  status: string;
  isActive: boolean;
  createdAt: Date;
  report: ReportRow | null;
};

export type ReportRow = {
  id: string;
  projectId: string;
  score: Decimalish;
  plagiarismFlag: boolean;
  techAgeFlag: boolean;
  relevanceScore: Decimalish;
  explanation: string;
  routedToReview: boolean;
  createdAt: Date;
};

function num(value: Decimalish): number {
  return typeof value === 'number' ? value : (value.toNumber?.() ?? Number(value));
}

export function toReportDto(row: ReportRow): ProjectVerificationReportDto {
  const { text, meta } = decodeReportMeta(row.explanation);
  return ProjectVerificationReportDtoSchema.parse({
    reportId: row.id,
    projectId: row.projectId,
    score: num(row.score),
    relevanceScore: num(row.relevanceScore),
    qualityScore: meta?.qualityScore ?? num(row.score),
    duplicateScore: meta?.duplicateScore ?? (row.plagiarismFlag ? 100 : 0),
    confidence: meta?.confidence ?? (row.routedToReview ? 0.4 : 0.8),
    plagiarismFlag: row.plagiarismFlag,
    techAgeFlag: row.techAgeFlag,
    flags: meta?.flags ?? [],
    explanation: text || row.explanation,
    routedToReview: row.routedToReview,
    promptRef: meta?.promptRef ?? PROJECT_VERIFY_PROMPT_REF,
    auditId: meta?.auditId ?? null,
    createdAt: row.createdAt.toISOString(),
  });
}

export function toProjectDto(row: ProjectRow, interview?: ProjectInterviewState): ProjectDto {
  const meta = row.report ? decodeReportMeta(row.report.explanation).meta : null;
  return ProjectDtoSchema.parse({
    projectId: row.id,
    studentId: row.studentId,
    title: row.title,
    problem: row.problem,
    approach: row.approach,
    stack: row.stack,
    outcome: row.outcome,
    loomUrl: row.loomUrl,
    githubUrl: row.githubUrl,
    liveUrl: row.liveUrl,
    status: row.status,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    report: row.report ? toReportDto(row.report) : null,
    interviewRequired: interview?.interviewRequired ?? false,
    interviewStatus: interview?.interviewStatus ?? 'NOT_REQUIRED',
    interviewCompletedAt: interview?.interviewCompletedAt ?? null,
    exclusionReason: meta?.exclusionReason ?? null,
  });
}

export function toQueueItem(
  row: ProjectRow & { student: { fullName: string } },
): ProjectReviewQueueItemDto {
  const report = row.report ? toReportDto(row.report) : null;
  return ProjectReviewQueueItemDtoSchema.parse({
    projectId: row.id,
    studentId: row.studentId,
    studentName: row.student.fullName,
    title: row.title,
    status: row.status,
    score: report?.score ?? null,
    confidence: report?.confidence ?? null,
    flags: report?.flags ?? [],
    routedToReview: report?.routedToReview ?? true,
    explanation: report?.explanation ?? null,
    createdAt: row.createdAt.toISOString(),
  });
}
