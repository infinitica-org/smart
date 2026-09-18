import { describe, expect, it } from 'vitest';

import type { ProjectDto } from '@smart/contracts';

import { pendingProjectOwnershipInterviews } from './pending-project-interviews';

function baseProject(overrides: Partial<ProjectDto>): ProjectDto {
  return {
    projectId: 'p1',
    studentId: 's1',
    title: 'Demo',
    problem: '',
    approach: '',
    stack: '',
    outcome: '',
    status: 'SUBMITTED',
    loomUrl: null,
    githubUrl: null,
    liveUrl: null,
    interviewRequired: false,
    interviewStatus: 'NOT_REQUIRED',
    interviewCompletedAt: null,
    report: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('pendingProjectOwnershipInterviews', () => {
  it('includes projects with pending ownership interview', () => {
    const pending = baseProject({
      interviewRequired: true,
      interviewStatus: 'PENDING',
    });
    const done = baseProject({
      projectId: 'p2',
      interviewRequired: true,
      interviewStatus: 'COMPLETED',
    });
    expect(pendingProjectOwnershipInterviews([pending, done])).toEqual([pending]);
  });
});
