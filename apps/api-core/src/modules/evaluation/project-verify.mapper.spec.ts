import { describe, expect, it } from 'vitest';
import { PROJECT_VERIFY_PROMPT_REF } from '@smart/contracts';
import {
  encodeReportExplanation,
  placeholderSnapshot,
  snapshotDigest,
  toReportDto,
} from './project-verify.mapper.js';

describe('project-verify mapper', () => {
  it('marks placeholder repos oauth_missing so the agent cannot treat them as fetched', () => {
    const snapshot = placeholderSnapshot(
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
      [
        {
          owner: 'ada',
          name: 'demo',
          htmlUrl: 'https://github.com/ada/demo',
          defaultBranch: 'main',
          isPrivate: false,
          githubRepoId: 1,
        },
      ],
    );
    expect(snapshot.repos[0]?.ok).toBe(false);
    expect(snapshot.repos[0]?.unavailableReason).toBe('oauth_missing');
    expect(snapshotDigest(snapshot.repos, false)).toMatch(/unavailable/i);
  });

  it('round-trips report meta without exposing the marker to the student explanation', () => {
    const encoded = encodeReportExplanation('Clean write-up with tests in CI.', {
      qualityScore: 70,
      duplicateScore: 0,
      confidence: 0.4,
      flags: ['SNAPSHOT_UNAVAILABLE'],
      promptRef: PROJECT_VERIFY_PROMPT_REF,
      auditId: null,
    });
    const dto = toReportDto({
      id: '123e4567-e89b-12d3-a456-426614174002',
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      score: 62,
      plagiarismFlag: false,
      techAgeFlag: false,
      relevanceScore: 70,
      explanation: encoded,
      routedToReview: true,
      createdAt: new Date('2026-09-02T10:00:00.000Z'),
    });
    expect(dto.explanation).toBe('Clean write-up with tests in CI.');
    expect(dto.flags).toEqual(['SNAPSHOT_UNAVAILABLE']);
    expect(dto.explanation).not.toContain('smart-verify');
  });
});
