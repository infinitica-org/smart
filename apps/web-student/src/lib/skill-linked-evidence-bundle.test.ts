import { describe, expect, it } from 'vitest';

import type { ProjectDto, ProjectSkillMappingDto } from '@smart/contracts';

import {
  linkedEvidenceContextForSkill,
  linkedProjectItems,
  type ProfileLinkedEvidenceBundle,
} from './skill-linked-evidence-bundle';

const sampleMapping: ProjectSkillMappingDto = {
  skillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
  specificContribution: 'Built API endpoints',
  actionsPerformed: [],
  decisionsMade: [],
  constraintsHandled: [],
  verificationStatus: 'PENDING',
};

function emptyBundle(projects: ProjectDto[] = []): ProfileLinkedEvidenceBundle {
  const projectTitleById = new Map(projects.map((p) => [p.projectId, p.title]));
  const liveProjectIds = new Set(projects.map((p) => p.projectId));
  return {
    projects,
    projectMappingsById: new Map([['proj-1', [sampleMapping]]]),
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
      status: 'SUBMITTED',
      loomUrl: null,
      githubUrl: null,
      liveUrl: null,
      interviewRequired: false,
      interviewStatus: 'NOT_REQUIRED',
      interviewCompletedAt: null,
      report: null,
      createdAt: new Date().toISOString(),
    };
    const context = linkedEvidenceContextForSkill(
      'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      emptyBundle([project]),
    );
    const projects = linkedProjectItems(context);
    expect(projects).toHaveLength(1);
    expect(projects[0]?.label).toBe('Weather API');
    expect(projects[0]?.href).toContain('project=proj-1');
  });
});
