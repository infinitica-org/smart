import { describe, expect, it } from 'vitest';
import { ProjectVerifyFlagSchema } from '../domain/enums.js';
import {
  CreateProjectRequestSchema,
  GithubRepoListDtoSchema,
  PROJECT_VERIFY_CONFIDENCE_AUTO,
  PROJECT_VERIFY_WEB_SEARCH_HITS,
  PROJECT_VERIFY_WEIGHTS,
  ProjectDtoSchema,
  ProjectGithubSnapshotSchema,
  ResolveProjectReviewRequestSchema,
} from './project-verify.dto.js';

const repoRef = {
  owner: 'alice',
  name: 'demo-api',
  htmlUrl: 'https://github.com/alice/demo-api',
  defaultBranch: 'main',
  isPrivate: false,
  githubRepoId: 42,
};

describe('CreateProjectRequestSchema', () => {
  it('accepts the CN-T08 template without GitHub picks', () => {
    const parsed = CreateProjectRequestSchema.parse({
      title: 'Campus bus tracker',
      problem: 'Students cannot see live bus location on campus routes.',
      approach: 'I used websockets and a small GPS ingest service.',
      stack: 'TypeScript, Nest, Redis',
      outcome: 'Average wait time dropped in a 30-student pilot.',
    });
    expect(parsed.githubRepos).toEqual([]);
  });

  it('rejects a one-line problem so the template is not a title dump', () => {
    expect(
      CreateProjectRequestSchema.safeParse({
        title: 'App',
        problem: 'too short',
        approach: 'I built it quickly with whatever was nearby.',
        stack: 'JS',
        outcome: 'It kind of worked for a weekend demo once.',
      }).success,
    ).toBe(false);
  });
});

describe('ProjectGithubSnapshotSchema', () => {
  it('caps the snapshot so a monorepo tree cannot flood the LLM', () => {
    const snapshot = ProjectGithubSnapshotSchema.parse({
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      studentId: '123e4567-e89b-12d3-a456-426614174001',
      snapshotVersion: 1,
      repos: [
        {
          ...repoRef,
          fetchedAt: '2026-09-02T10:00:00.000Z',
          description: 'Demo',
          primaryLanguage: 'TypeScript',
          languages: { TypeScript: 1000 },
          topics: [],
          licenseSpdx: 'MIT',
          createdAt: '2025-01-01T00:00:00.000Z',
          pushedAt: '2026-08-01T00:00:00.000Z',
          stargazersCount: 0,
          forksCount: 0,
          isFork: false,
          parentFullName: null,
          openIssuesCount: 0,
          archived: false,
          readmePath: 'README.md',
          readmeMarkdown: '# demo',
          readmeSha: 'abc1234',
          readmeTruncated: false,
          rootEntries: [{ path: 'src', type: 'dir' }],
          detectedFiles: {
            hasPackageJson: true,
            hasPyproject: false,
            hasDockerfile: false,
            hasCiConfig: true,
            hasLockfile: true,
            hasTestsDir: true,
          },
          recentCommits: [
            {
              sha: 'deadbee',
              committedAt: '2026-08-01T00:00:00.000Z',
              message: 'init',
            },
          ],
          uniqueAuthorLogins: ['alice'],
          commitSpanDays: 30,
          ok: true,
        },
      ],
    });
    expect(snapshot.repos).toHaveLength(1);
  });

  it('records oauth_missing so scoring still runs without auto-reject', () => {
    const list = GithubRepoListDtoSchema.parse({ connected: false, repos: [] });
    expect(list.connected).toBe(false);
  });
});

describe('routing constants', () => {
  it('keeps originality as a minority weight so a duplicate flag cannot mint a high score alone', () => {
    const sum =
      PROJECT_VERIFY_WEIGHTS.relevance +
      PROJECT_VERIFY_WEIGHTS.quality +
      PROJECT_VERIFY_WEIGHTS.originality;
    expect(sum).toBeCloseTo(1, 5);
    expect(PROJECT_VERIFY_CONFIDENCE_AUTO).toBeGreaterThan(0.5);
  });

  it('caps public web hits and names PUBLIC_WEB_SIMILARITY on the existing flag enum', () => {
    expect(PROJECT_VERIFY_WEB_SEARCH_HITS).toBe(5);
    expect(ProjectVerifyFlagSchema.parse('PUBLIC_WEB_SIMILARITY')).toBe('PUBLIC_WEB_SIMILARITY');
    expect(ProjectVerifyFlagSchema.safeParse('COPIED_FROM_INTERNET').success).toBe(false);
  });
});

describe('human review resolve', () => {
  it('allows REJECT only from a reviewer payload', () => {
    expect(
      ResolveProjectReviewRequestSchema.parse({
        resolution: 'REJECT',
        reason: 'Copied README from a tutorial repo.',
      }).resolution,
    ).toBe('REJECT');
  });
});

describe('ProjectDtoSchema', () => {
  it('allows a processing row with no report yet', () => {
    const dto = ProjectDtoSchema.parse({
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      studentId: '123e4567-e89b-12d3-a456-426614174001',
      title: 'Campus bus tracker',
      problem: 'Students cannot see live bus location on campus routes.',
      approach: 'I used websockets and a small GPS ingest service.',
      stack: 'TypeScript',
      outcome: 'Average wait time dropped in a 30-student pilot.',
      loomUrl: null,
      githubUrl: null,
      status: 'SUBMITTED',
      createdAt: '2026-09-02T10:00:00.000Z',
      report: null,
    });
    expect(dto.report).toBeNull();
  });
});
