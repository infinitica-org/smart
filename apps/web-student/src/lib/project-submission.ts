import {
  CreateProjectRequestSchema,
  type CreateProjectRequest,
  type ProjectDto,
} from '@smart/contracts';

export type ProjectFormFields = {
  title: string;
  problem: string;
  approach: string;
  stack: string;
  outcome: string;
  githubUrl: string;
  liveUrl: string;
};

export const EMPTY_PROJECT_FORM: ProjectFormFields = {
  title: '',
  problem: '',
  approach: '',
  stack: '',
  outcome: '',
  githubUrl: '',
  liveUrl: '',
};

export function buildCreateProjectRequest(fields: ProjectFormFields): CreateProjectRequest {
  return CreateProjectRequestSchema.parse({
    title: fields.title.trim(),
    problem: fields.problem.trim(),
    approach: fields.approach.trim(),
    stack: fields.stack.trim(),
    outcome: fields.outcome.trim(),
    githubUrl: fields.githubUrl.trim() || undefined,
    liveUrl: fields.liveUrl.trim() || undefined,
  });
}

export function isZodLikeError(
  error: unknown,
): error is { issues: { path: PropertyKey[]; message: string }[] } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'issues' in error &&
    Array.isArray((error as { issues: unknown }).issues)
  );
}

export function fieldErrorsFromZod(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const map: Partial<Record<keyof ProjectFormFields, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && map[key as keyof ProjectFormFields] === undefined) {
      map[key as keyof ProjectFormFields] = issue.message;
    }
  }
  return map;
}

export function isProcessingStatus(project: Pick<ProjectDto, 'status' | 'report'>): boolean {
  return project.status === 'SUBMITTED' && !project.report;
}

export function needsOwnershipInterview(project: ProjectDto): boolean {
  return (
    project.interviewRequired &&
    (project.interviewStatus === 'PENDING' || project.interviewStatus === 'IN_PROGRESS')
  );
}

export interface StackTagCount {
  tag: string;
  count: number;
}

/** Ranks stack tags (comma-separated per project) by how many projects use them. */
export function topStackTags(projects: readonly ProjectDto[], limit = 6): StackTagCount[] {
  const counts = new Map<string, number>();
  for (const project of projects) {
    const tags = new Set(
      project.stack
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    );
    for (const tag of tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}

export function processingStateCopy(project: ProjectDto): {
  tone: 'info' | 'success' | 'warning';
  title: string;
  body: string;
} {
  if (project.status === 'SUBMITTED' && !project.report) {
    return {
      tone: 'info',
      title: 'Verifying',
      body: 'Integrity verification is running. This page will update when it finishes — then complete the ownership interview.',
    };
  }
  if (needsOwnershipInterview(project)) {
    return {
      tone: 'warning',
      title: 'Interview required',
      body: 'Automated verification finished. Complete the voice ownership interview when you are ready.',
    };
  }
  if (project.status === 'UNDER_REVIEW') {
    return {
      tone: 'warning',
      title: 'Under review',
      body: 'Verification finished with a human-review flag. Your project is not auto-rejected.',
    };
  }
  if (project.status === 'VERIFIED') {
    return {
      tone: 'success',
      title: 'Verified',
      body: 'Verification completed. The report is attached to this project.',
    };
  }
  return {
    tone: 'warning',
    title: 'Not verified',
    body: 'A reviewer declined this submission. You can submit a revised project.',
  };
}
