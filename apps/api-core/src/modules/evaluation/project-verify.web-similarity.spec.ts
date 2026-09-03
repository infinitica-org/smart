import { describe, expect, it, vi } from 'vitest';
import {
  buildPublicSearchQuery,
  publicSimilarityDigest,
  searchPublicProjectMatches,
} from './project-verify.web-similarity.js';

const brief =
  'students cannot see live bus location on campus routes I used websockets and a gps ingest';

describe('buildPublicSearchQuery', () => {
  it('strips quotes and keeps stack language', () => {
    expect(buildPublicSearchQuery('Campus "bus" tracker', 'TypeScript, Nest')).toBe(
      'Campus bus tracker TypeScript',
    );
  });
});

describe('searchPublicProjectMatches', () => {
  it('scores a public GitHub hit that restates the brief and skips the student repo', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (new URL(url).hostname === 'api.github.com') {
        return new Response(
          JSON.stringify({
            items: [
              {
                full_name: 'alice/campus-bus',
                html_url: 'https://github.com/alice/campus-bus',
                description: 'ignore me',
                name: 'campus-bus',
              },
              {
                full_name: 'other/bus-tracker',
                html_url: 'https://github.com/other/bus-tracker',
                description: brief,
                name: 'bus-tracker',
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ Abstract: '', RelatedTopics: [] }), { status: 200 });
    });

    const result = await searchPublicProjectMatches({
      title: 'Campus bus tracker',
      stack: 'TypeScript',
      currentText: brief,
      excludeFullNames: ['alice/campus-bus'],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    expect(result.hits.map((hit) => hit.title)).toEqual(['other/bus-tracker']);
    expect(result.score).toBeGreaterThan(60);
  });

  it('fails closed to ok=false when both public sources error', async () => {
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 503 }));
    const result = await searchPublicProjectMatches({
      title: 'Campus bus tracker',
      stack: 'TypeScript',
      currentText: brief,
      excludeFullNames: [],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(false);
    expect(result.score).toBe(0);
    expect(publicSimilarityDigest(result)).toContain('unavailable');
  });

  it('reads a cached payload and does not call the network', async () => {
    const fetchImpl = vi.fn();
    const cache = {
      get: vi.fn().mockResolvedValue(
        JSON.stringify({
          ok: true,
          score: 12,
          hits: [{ title: 'cached', url: 'https://example.com/p', snippet: 'x' }],
        }),
      ),
      setex: vi.fn(),
    };
    const result = await searchPublicProjectMatches({
      title: 'Campus bus tracker',
      stack: 'TypeScript',
      currentText: brief,
      excludeFullNames: [],
      fetchImpl: fetchImpl as unknown as typeof fetch,
      cache,
    });
    expect(result.score).toBe(12);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
