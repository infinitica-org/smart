import {
  CreateProjectRequestSchema,
  type CreateProjectRequest,
  type GithubRepoRef,
  type ProjectDto,
  type ProjectStatus,
} from '@smart/contracts';

export type ProjectFormFields = {
  title: string;
  problem: string;
  approach: string;
  stack: string;
  outcome: string;
  loomUrl: string;
  githubUrl: string;
};

export const EMPTY_PROJECT_FORM: ProjectFormFields = {
  title: '',
  problem: '',
  approach: '',
  stack: '',
  outcome: '',
  loomUrl: '',
  githubUrl: '',
};

export function buildCreateProjectRequest(
  fields: ProjectFormFields,
  githubRepos: GithubRepoRef[] = [],
): CreateProjectRequest {
  return CreateProjectRequestSchema.parse({
    title: fields.title.trim(),
    problem: fields.problem.trim(),
    approach: fields.approach.trim(),
    stack: fields.stack.trim(),
    outcome: fields.outcome.trim(),
    loomUrl: fields.loomUrl.trim() || undefined,
    githubUrl: fields.githubUrl.trim() || undefined,
    githubRepos,
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

export function isProcessingStatus(status: ProjectStatus): boolean {
  return status === 'SUBMITTED';
}

export function processingStateCopy(project: ProjectDto): {
  tone: 'info' | 'success' | 'warning';
  title: string;
  body: string;
} {
  if (project.status === 'SUBMITTED') {
    return {
      tone: 'info',
      title: 'Processing',
      body: 'Your project is queued for verification. This page will update when scoring finishes — this is not a silent wait.',
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
