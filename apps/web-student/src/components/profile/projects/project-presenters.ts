import type { ProjectDto } from '@smart/contracts';

export function parseStackTags(stack: string): string[] {
  return stack
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function projectSummaryText(project: ProjectDto, maxLength = 140): string {
  const source = project.problem.trim() || project.outcome.trim();
  if (source.length <= maxLength) return source;
  return `${source.slice(0, maxLength - 1).trimEnd()}…`;
}

export function formatRepoUpdatedAt(iso: string | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}
