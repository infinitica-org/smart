import { describe, expect, it } from 'vitest';
import {
  buildCreateProjectRequest,
  fieldErrorsFromZod,
  isProcessingStatus,
  processingStateCopy,
} from './project-submission';

const valid = {
  title: 'Campus bus tracker',
  problem: 'Students cannot see live bus location on campus routes.',
  approach: 'I used websockets and a small GPS ingest service.',
  skillCodes: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
  outcome: 'Average wait time dropped in a 30-student pilot.',
  githubUrl: 'https://github.com/org/repo',
  liveUrl: '',
};

describe('buildCreateProjectRequest', () => {
  it('maps the CN-T08 template and omits empty optional links', () => {
    const body = buildCreateProjectRequest(valid);
    expect(body.stack).toContain('Python');
    expect(body.githubUrl).toBe('https://github.com/org/repo');
    expect(body.loomUrl).toBeUndefined();
    expect(body.githubRepos).toEqual([]);
  });

  it('rejects a one-line problem', () => {
    expect(() => buildCreateProjectRequest({ ...valid, problem: 'too short' })).toThrow();
  });
});

describe('processing state', () => {
  it('treats SUBMITTED without report as explicit processing, not an empty spinner', () => {
    const pending = {
      status: 'SUBMITTED' as const,
      report: null,
    };
    expect(isProcessingStatus(pending)).toBe(true);
    const copy = processingStateCopy({
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      studentId: '123e4567-e89b-12d3-a456-426614174001',
      title: valid.title,
      problem: valid.problem,
      approach: valid.approach,
      stack: 'Python Application & Backend Development',
      outcome: valid.outcome,
      loomUrl: null,
      githubUrl: null,
      liveUrl: null,
      status: 'SUBMITTED',
      createdAt: '2026-09-02T10:00:00.000Z',
      report: null,
      interviewRequired: false,
      interviewStatus: 'NOT_REQUIRED' as const,
      interviewCompletedAt: null,
    });
    expect(copy.title).toBe('Verifying');
    expect(copy.body).toMatch(/integrity verification is running/i);
  });
});

describe('fieldErrorsFromZod', () => {
  it('keeps the first message per field', () => {
    const map = fieldErrorsFromZod({
      issues: [
        { path: ['problem'], message: 'Too short' },
        { path: ['problem'], message: 'Still short' },
      ],
    });
    expect(map.problem).toBe('Too short');
  });
});
