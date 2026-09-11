import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  REDIS_TTL_SECONDS,
  type HackerrankBadge,
  type HackerrankContestRating,
  type HackerrankSolvedByTag,
} from '@smart/contracts';
import { z } from 'zod';
import { RedisService } from '../../../platform/redis/redis.service.js';
import { SignalCircuitBreaker } from '../signal-circuit-breaker.js';

const FETCH_MS = 4_000;
const HR_HOST = 'www.hackerrank.com';

const HackerrankProfileResponseSchema = z.object({
  model: z
    .object({
      badges: z
        .array(
          z.object({
            badge_name: z.string(),
            level: z.string().optional(),
          }),
        )
        .optional()
        .default([]),
      contest_ratings: z
        .array(
          z.object({
            track: z.string(),
            rating: z.number(),
            rank: z.number().optional(),
          }),
        )
        .optional(),
      skills: z
        .array(
          z.object({
            name: z.string(),
            total_challenges: z.number().optional(),
            total_solved: z.number().optional(),
          }),
        )
        .optional()
        .default([]),
    })
    .optional(),
});

export interface HackerrankProfileData {
  readonly badges: readonly HackerrankBadge[];
  readonly contestRatings: readonly HackerrankContestRating[];
  readonly solvedByTag: readonly HackerrankSolvedByTag[];
}

/**
 * Thin HackerRank public profile client (S6-VB-01).
 *
 * Owner: Vishal Bharath R.
 */
@Injectable()
export class HackerrankApiClient {
  private readonly logger = new Logger(HackerrankApiClient.name);

  constructor(
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(SignalCircuitBreaker) private readonly breaker: SignalCircuitBreaker,
  ) {}

  async fetchProfile(username: string): Promise<HackerrankProfileData> {
    const cacheKey = `hackerrank:profile:${username.toLowerCase()}`;
    try {
      const hit = await this.redis.get(cacheKey);
      if (hit) return JSON.parse(hit) as HackerrankProfileData;
    } catch {
      /* cache miss */
    }

    const url = `https://${HR_HOST}/rest/hackers/${encodeURIComponent(username)}/profile`;
    const raw = await this.breaker.execute('HACKERRANK', async (signal) => {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'smart-signal-ingestion' },
        signal: AbortSignal.any([signal, AbortSignal.timeout(FETCH_MS)]),
      });
      if (!response.ok) {
        throw new Error(`HackerRank profile fetch failed: HTTP ${response.status}`);
      }
      return HackerrankProfileResponseSchema.parse(await response.json());
    });

    const model = raw.model;
    const badges: HackerrankBadge[] = (model?.badges ?? []).map((badge) => ({
      name: badge.badge_name,
      level: badge.level ?? 'unknown',
    }));
    const contestRatings: HackerrankContestRating[] = (model?.contest_ratings ?? []).map((row) => ({
      track: row.track,
      rating: row.rating,
      rank: row.rank,
    }));
    const solvedByTag: HackerrankSolvedByTag[] = (model?.skills ?? [])
      .filter((skill) => (skill.total_solved ?? 0) > 0)
      .map((skill) => ({
        tag: skill.name,
        count: skill.total_solved ?? 0,
        difficulty: 'UNKNOWN' as const,
      }));

    const result: HackerrankProfileData = { badges, contestRatings, solvedByTag };
    try {
      await this.redis.setex(cacheKey, REDIS_TTL_SECONDS.hackerrankProfile, JSON.stringify(result));
    } catch {
      this.logger.debug('HackerRank profile cache write skipped');
    }
    return result;
  }

  async probeProfileExists(username: string): Promise<boolean> {
    const url = `https://${HR_HOST}/${encodeURIComponent(username)}`;
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_MS),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
