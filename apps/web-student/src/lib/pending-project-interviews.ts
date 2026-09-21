import type { ProjectDto } from '@smart/contracts';

import { needsOwnershipInterview } from '@/lib/project-submission';

export function pendingProjectOwnershipInterviews(projects: readonly ProjectDto[]): ProjectDto[] {
  return projects.filter(needsOwnershipInterview);
}
