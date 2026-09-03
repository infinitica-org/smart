import { describe, expect, it } from 'vitest';
import { PROJECT_VERIFY_REPO_MAX, type GithubRepoRef } from '@smart/contracts';
import {
  buildCreateProjectRequest,
  fieldErrorsFromZod,
  isProcessingStatus,
  processingStateCopy,
} from './project-submission';

function githubRepo(n: number): GithubRepoRef {
  return {
    owner: 'ada',
    name: `repo-${String(n)}`,
    htmlUrl: `https://github.com/ada/repo-${String(n)}`,
    defaultBranch: 'main',
    isPrivate: false,
    githubRepoId: n,
  };
}

const valid = {
  title: 'Campus bus tracker',
  problem: 'Students cannot see live bus location on campus routes.',
  approach: 'I used websockets and a small GPS ingest service.',
  stack: 'TypeScript, Nest, Redis',
  outcome: 'Average wait time dropped in a 30-student pilot.',
  loomUrl: 'https://www.loom.com/share/abc123',
  githubUrl: '',
};

describe('buildCreateProjectRequest', () => {
  it('maps the CN-T08 template and omits an empty GitHub link', () => {
    const body = buildCreateProjectRequest(valid);
    expect(body.githubUrl).toBeUndefined();
    expect(body.loomUrl).toBe('https://www.loom.com/share/abc123');
    expect(body.githubRepos).toEqual([]);
  });

  it('rejects a one-line problem', () => {
    expect(() => buildCreateProjectRequest({ ...valid, problem: 'too short' })).toThrow();
  });

  it('rejects invalid Loom and GitHub URLs', () => {
    expect(() => buildCreateProjectRequest({ ...valid, loomUrl: 'not-a-url' })).toThrow();
    expect(() => buildCreateProjectRequest({ ...valid, githubUrl: 'not-a-url' })).toThrow();
  });

  it('accepts up to PROJECT_VERIFY_REPO_MAX githubRepos and rejects more', () => {
    const three = Array.from({ length: PROJECT_VERIFY_REPO_MAX }, (_, i) => githubRepo(i + 1));
    const body = buildCreateProjectRequest(valid, three);
    expect(body.githubRepos).toHaveLength(PROJECT_VERIFY_REPO_MAX);

    const four = [...three, githubRepo(PROJECT_VERIFY_REPO_MAX + 1)];
    expect(() => buildCreateProjectRequest(valid, four)).toThrow();
  });
});

describe('processing state', () => {
  it('treats SUBMITTED as explicit processing, not an empty spinner', () => {
    expect(isProcessingStatus('SUBMITTED')).toBe(true);
    const copy = processingStateCopy({
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      studentId: '123e4567-e89b-12d3-a456-426614174001',
      title: valid.title,
      problem: valid.problem,
      approach: valid.approach,
      stack: valid.stack,
      outcome: valid.outcome,
      loomUrl: valid.loomUrl,
      githubUrl: null,
      status: 'SUBMITTED',
      createdAt: '2026-09-02T10:00:00.000Z',
      report: null,
    });
    expect(copy.title).toBe('Processing');
    expect(copy.body).toMatch(/queued for verification/i);
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
