import { describe, expect, it } from 'vitest';

import type { ProjectDto } from '@smart/contracts';

import {
  linkedEvidenceContextForSkill,
  linkedProjectItems,
  type ProfileLinkedEvidenceBundle,
} from './skill-linked-evidence-bundle';

function emptyBundle(projects: ProjectDto[] = []): ProfileLinkedEvidenceBundle {
  const projectTitleById = new Map(projects.map((p) => [p.projectId, p.title]));
  const liveProjectIds = new Set(projects.map((p) => p.projectId));
  return {
    projects,
    projectMappingsById: new Map([
      [
        'proj-1',
        [
          {
            projectId: 'proj-1',
            skillCode: 'SE_PYTHON',
            verificationStatus: 'PENDING',
          },
        ],
      ],
    ]),
    workExperiences: [],
    projectTitleById,
    experienceLabelById: new Map(),
    liveProjectIds,
    liveExperienceIds: new Set(),
  };
}

describe('skill-linked-evidence-bundle', () => {
  it('surfaces linked projects for a skill from mappings', () => {
    const project: ProjectDto = {
      projectId: 'proj-1',
      studentId: 'stu-1',
      title: 'Weather API',
      problem: '',
      approach: '',
      stack: 'Python',
      outcome: '',
      status: 'DRAFT',
      githubUrl: null,
      liveUrl: null,
      interviewRequired: false,
      interviewStatus: 'NOT_REQUIRED',
      interviewCompletedAt: null,
      report: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const context = linkedEvidenceContextForSkill('SE_PYTHON', emptyBundle([project]));
    const projects = linkedProjectItems(context);
    expect(projects).toHaveLength(1);
    expect(projects[0]?.label).toBe('Weather API');
    expect(projects[0]?.href).toContain('project=proj-1');
  });
});
