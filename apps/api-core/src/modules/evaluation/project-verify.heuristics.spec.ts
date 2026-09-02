import { describe, expect, it } from 'vitest';
import type { GithubRepoSnapshot } from '@smart/contracts';
import {
  collectFlags,
  compositeProjectScore,
  duplicateScore,
  jaccard,
  routeProjectVerification,
  techAgeFlag,
} from './project-verify.heuristics.js';

const nearDup =
  'students cannot see live bus location on campus routes I used websockets and a gps ingest';

describe('duplicate-text heuristic', () => {
  it('scores near-identical briefs high and unrelated briefs low', () => {
    expect(jaccard(nearDup, nearDup)).toBeGreaterThan(0.9);
    expect(
      duplicateScore(nearDup, ['unrelated cooking recipe with saffron and dough']),
    ).toBeLessThan(20);
    expect(duplicateScore(nearDup, [nearDup])).toBeGreaterThan(90);
  });
});

describe('tech-age flag', () => {
  it('flags a repo that has not been pushed in three years', () => {
    const repo = {
      ok: true,
      pushedAt: '2018-01-01T00:00:00.000Z',
    } as GithubRepoSnapshot;
    expect(techAgeFlag([repo], new Date('2026-09-02T00:00:00.000Z'))).toBe(true);
    expect(
      techAgeFlag(
        [{ ...repo, pushedAt: '2026-01-01T00:00:00.000Z' }],
        new Date('2026-09-02T00:00:00.000Z'),
      ),
    ).toBe(false);
  });
});

describe('routing', () => {
  it('never returns REJECTED from the agent', () => {
    const flagged = routeProjectVerification({
      confidence: 0.2,
      flags: ['DUPLICATE_TEXT', 'LLM_UNAVAILABLE'],
    });
    expect(flagged.status).toBe('UNDER_REVIEW');
    expect(flagged.routedToReview).toBe(true);
    expect(routeProjectVerification({ confidence: 0.95, flags: [] }).status).toBe('VERIFIED');
  });

  it('keeps originality from dominating the composite score', () => {
    expect(
      compositeProjectScore({ relevanceScore: 50, qualityScore: 50, duplicateScore: 0 }),
    ).toBeCloseTo(60, 5);
  });

  it('marks missing snapshots for review', () => {
    expect(
      collectFlags({
        duplicate: 0,
        techAge: false,
        stackMismatch: false,
        snapshotOk: false,
        llmFailed: false,
        confidence: 0.9,
      }),
    ).toContain('SNAPSHOT_UNAVAILABLE');
  });

  it('flags a public-web match separately from a prior SMART submission', () => {
    expect(
      collectFlags({
        duplicate: 0,
        publicWeb: 80,
        techAge: false,
        stackMismatch: false,
        snapshotOk: true,
        llmFailed: false,
        confidence: 0.9,
      }),
    ).toEqual(['PUBLIC_WEB_SIMILARITY']);
  });

  it('never returns REJECTED when PUBLIC_WEB_SIMILARITY is set', () => {
    expect(
      routeProjectVerification({ confidence: 0.95, flags: ['PUBLIC_WEB_SIMILARITY'] }).status,
    ).toBe('UNDER_REVIEW');
  });

  it('routes a failed public web search to review without rejecting', () => {
    expect(
      collectFlags({
        duplicate: 0,
        techAge: false,
        stackMismatch: false,
        snapshotOk: true,
        llmFailed: false,
        confidence: 0.9,
        webSearchFailed: true,
      }),
    ).toContain('LOW_CONFIDENCE');
  });
});
