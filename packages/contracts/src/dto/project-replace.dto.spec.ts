import { describe, expect, it } from 'vitest';
import {
  ProjectDtoSchema,
  ReplaceProjectRequestSchema,
  ReplaceProjectResponseSchema,
} from './project-verify.dto.js';

const projectId = '123e4567-e89b-12d3-a456-426614174000';
const studentId = '123e4567-e89b-12d3-a456-426614174001';
const replacementId = '123e4567-e89b-12d3-a456-426614174002';

function sampleProject(overrides: Record<string, unknown> = {}) {
  return {
    projectId,
    studentId,
    title: 'Campus bus tracker',
    problem: 'Students cannot see live bus location on campus routes.',
    approach: 'I used websockets and a small GPS ingest service.',
    stack: 'TypeScript',
    outcome: 'Average wait time dropped in a 30-student pilot.',
    loomUrl: null,
    githubUrl: null,
    liveUrl: null,
    status: 'VERIFIED',
    isActive: true,
    createdAt: '2026-09-02T10:00:00.000Z',
    report: null,
    interviewRequired: false,
    interviewStatus: 'NOT_REQUIRED',
    interviewCompletedAt: null,
    exclusionReason: null,
    ...overrides,
  };
}

describe('ReplaceProjectRequestSchema', () => {
  it('requires a replacement project id', () => {
    expect(
      ReplaceProjectRequestSchema.parse({ replacementProjectId: replacementId })
        .replacementProjectId,
    ).toBe(replacementId);
  });
});

describe('ReplaceProjectResponseSchema', () => {
  it('returns both portfolio rows', () => {
    const parsed = ReplaceProjectResponseSchema.parse({
      replacedProject: sampleProject({ projectId, isActive: false }),
      replacementProject: sampleProject({ projectId: replacementId, title: 'New app' }),
    });
    expect(parsed.replacedProject.isActive).toBe(false);
    expect(parsed.replacementProject.projectId).toBe(replacementId);
  });
});

describe('ProjectDtoSchema isActive', () => {
  it('accepts inactive portfolio rows', () => {
    const dto = ProjectDtoSchema.parse(sampleProject({ isActive: false }));
    expect(dto.isActive).toBe(false);
  });
});
