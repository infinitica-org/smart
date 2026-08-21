import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { getRateLimitPolicy, type RateLimitPolicy } from '@smart/contracts';
import { rateLimitRejections, rateLimitUtilisation } from '@smart/observability';
import { env } from '../../platform/config/env.js';
import { RedisService } from '../../platform/redis/redis.service.js';
import { SLIDING_WINDOW_LUA } from './sliding-window.lua.js';

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly count: number;
  readonly limit: number;
  readonly retryAfterSeconds: number;
  readonly policy: RateLimitPolicy;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(@Inject(RedisService) private readonly redis: RedisService) {}

  async consume(
    policyKey: string,
    identity: string,
    role: string,
    route: string,
  ): Promise<RateLimitDecision> {
    const policy = getRateLimitPolicy(policyKey);
    const windowMs = policy.windowSeconds * 1000;
    const key = policy.redisKey.replace('{id}', identity);

    try {
      const result = (await this.redis.eval(
        SLIDING_WINDOW_LUA,
        1,
        key,
        String(policy.limit),
        String(windowMs),
        String(Date.now()),
        randomUUID(),
      )) as [number, number, number];

      const allowed = result[0] === 1;
      const count = Number(result[1]);
      const retryAfterMs = Number(result[2]);

      rateLimitUtilisation.set({ policy: policyKey, role }, count / policy.limit);
      if (!allowed) {
        rateLimitRejections.inc({ policy: policyKey, role, route });
      }

      return {
        allowed,
        count,
        limit: policy.limit,
        retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
        policy,
      };
    } catch (error) {
      if (env.NODE_ENV === 'production') throw error;
      this.logger.warn(
        `Rate limiter skipped (Redis down) for ${policyKey}. Local-only fail-open. ${error instanceof Error ? error.message : ''}`,
      );
      return {
        allowed: true,
        count: 0,
        limit: policy.limit,
        retryAfterSeconds: 0,
        policy,
      };
    }
  }
}
