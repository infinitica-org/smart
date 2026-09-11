import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../__fixtures__/leetcode-profile.json',
);

const LeetcodeGraphqlResponseSchema = z.object({
  data: z.object({
    matchedUser: z.object({
      submitStats: z.object({
        acSubmissionNum: z.array(z.object({ difficulty: z.string(), count: z.number() })),
      }),
      tagProblemCounts: z.object({
        advanced: z.array(z.object({ tagName: z.string(), problemsSolved: z.number() })),
        intermediate: z.array(z.object({ tagName: z.string(), problemsSolved: z.number() })),
        fundamental: z.array(z.object({ tagName: z.string(), problemsSolved: z.number() })),
      }),
      userCalendar: z.object({ submissionCalendar: z.string().optional() }).optional(),
    }),
  }),
});

describe('LeetcodeStatsClient fixture', () => {
  it('parses golden LeetCode GraphQL JSON', () => {
    const raw = JSON.parse(readFileSync(fixturePath, 'utf8'));
    const parsed = LeetcodeGraphqlResponseSchema.parse(raw);
    expect(parsed.data.matchedUser.submitStats.acSubmissionNum).toHaveLength(4);
    expect(parsed.data.matchedUser.tagProblemCounts.advanced[0]?.tagName).toBe(
      'Dynamic Programming',
    );
  });
});
