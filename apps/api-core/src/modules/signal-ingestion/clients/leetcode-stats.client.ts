import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  REDIS_TTL_SECONDS,
  type LeetcodeSolvedCounts,
  type LeetcodeTagStat,
} from '@smart/contracts';
import { z } from 'zod';
import { RedisService } from '../../../platform/redis/redis.service.js';
import { SignalCircuitBreaker } from '../signal-circuit-breaker.js';

const FETCH_MS = 4_000;
const LC_GRAPHQL = 'https://leetcode.com/graphql';

const LeetcodeGraphqlResponseSchema = z.object({
  data: z
    .object({
      matchedUser: z
        .object({
          submitStats: z.object({
            acSubmissionNum: z.array(
              z.object({
                difficulty: z.string(),
                count: z.number(),
              }),
            ),
          }),
          tagProblemCounts: z.object({
            advanced: z.array(z.object({ tagName: z.string(), problemsSolved: z.number() })),
            intermediate: z.array(z.object({ tagName: z.string(), problemsSolved: z.number() })),
            fundamental: z.array(z.object({ tagName: z.string(), problemsSolved: z.number() })),
          }),
          userCalendar: z
            .object({
              submissionCalendar: z.string().optional(),
            })
            .optional(),
        })
        .nullable(),
    })
    .optional(),
});

const LC_PROFILE_QUERY = `
query userPublicProfile($username: String!) {
  matchedUser(username: $username) {
    submitStats {
      acSubmissionNum { difficulty count }
    }
    tagProblemCounts {
      advanced { tagName problemsSolved }
      intermediate { tagName problemsSolved }
      fundamental { tagName problemsSolved }
    }
    userCalendar { submissionCalendar }
  }
}`;

export interface LeetcodeProfileData {
  readonly solvedCounts: LeetcodeSolvedCounts;
  readonly tagStats: readonly LeetcodeTagStat[];
  readonly recentActivityDays: number;
}

function slugifyTag(tagName: string): string {
  return tagName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function countRecentActivityDays(submissionCalendar?: string): number {
  if (!submissionCalendar) return 0;
  try {
    const parsed = JSON.parse(submissionCalendar) as Record<string, string>;
    const cutoff = Date.now() / 1000 - 90 * 24 * 60 * 60;
    return Object.entries(parsed).filter(([day]) => Number(day) >= cutoff).length;
  } catch {
    return 0;
  }
}

/**
 * LeetCode public stats via documented community GraphQL endpoint (S6-VB-01).
 *
 * Owner: Vishal Bharath R.
 */
@Injectable()
export class LeetcodeStatsClient {
  private readonly logger = new Logger(LeetcodeStatsClient.name);

  constructor(
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(SignalCircuitBreaker) private readonly breaker: SignalCircuitBreaker,
  ) {}

  async fetchProfile(username: string): Promise<LeetcodeProfileData> {
    const cacheKey = `leetcode:profile:${username.toLowerCase()}`;
    try {
      const hit = await this.redis.get(cacheKey);
      if (hit) return JSON.parse(hit) as LeetcodeProfileData;
    } catch {
      /* cache miss */
    }

    await this.acquireGlobalToken();

    const parsed = await this.breaker.execute('LEETCODE', async (signal) => {
      const response = await fetch(LC_GRAPHQL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'smart-signal-ingestion',
        },
        body: JSON.stringify({
          query: LC_PROFILE_QUERY,
          variables: { username },
        }),
        signal: AbortSignal.any([signal, AbortSignal.timeout(FETCH_MS)]),
      });
      if (!response.ok) {
        throw new Error(`LeetCode GraphQL failed: HTTP ${response.status}`);
      }
      return LeetcodeGraphqlResponseSchema.parse(await response.json());
    });

    const user = parsed.data?.matchedUser;
    if (!user) {
      throw new Error(`LeetCode user not found: ${username}`);
    }

    const byDifficulty = Object.fromEntries(
      user.submitStats.acSubmissionNum.map((row) => [row.difficulty.toLowerCase(), row.count]),
    ) as Record<string, number>;
    const easy = byDifficulty.easy ?? 0;
    const medium = byDifficulty.medium ?? 0;
    const hard = byDifficulty.hard ?? 0;
    const total = byDifficulty.all ?? easy + medium + hard;

    const tagStats: LeetcodeTagStat[] = [
      ...user.tagProblemCounts.fundamental,
      ...user.tagProblemCounts.intermediate,
      ...user.tagProblemCounts.advanced,
    ]
      .filter((tag) => tag.problemsSolved > 0)
      .map((tag) => ({
        tagSlug: slugifyTag(tag.tagName),
        problemsSolved: tag.problemsSolved,
      }));

    const result: LeetcodeProfileData = {
      solvedCounts: { easy, medium, hard, total },
      tagStats,
      recentActivityDays: countRecentActivityDays(user.userCalendar?.submissionCalendar),
    };

    try {
      await this.redis.setex(cacheKey, REDIS_TTL_SECONDS.leetcodeProfile, JSON.stringify(result));
    } catch {
      this.logger.debug('LeetCode profile cache write skipped');
    }
    return result;
  }

  /** Global token bucket — one request per second across all users. */
  private async acquireGlobalToken(): Promise<void> {
    const key = 'leetcode:api:global';
    try {
      const allowed = await this.redis.set(key, '1', 'EX', 1, 'NX');
      if (allowed !== 'OK') {
        throw new Error('LeetCode global rate limit exceeded');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('rate limit')) {
        throw error;
      }
      /* Redis unavailable — proceed without global throttle */
    }
  }
}
