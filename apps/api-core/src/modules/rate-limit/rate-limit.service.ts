import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  RateLimitExceededEventSchema,
  SMART_TOPICS,
  getRateLimitPolicy,
  type RateLimitPolicy,
} from '@smart/contracts';
import { getContext, rateLimitRejections, rateLimitUtilisation } from '@smart/observability';
import { env } from '../../platform/config/env.js';
import { KafkaService } from '../../platform/kafka/kafka.service.js';
import { RedisService } from '../../platform/redis/redis.service.js';
import { SLIDING_WINDOW_LUA } from './sliding-window.lua.js';
import { TOKEN_BUCKET_LUA } from './token-bucket.lua.js';

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly count: number;
  readonly limit: number;
  readonly retryAfterSeconds: number;
  readonly resetAtEpochSeconds: number;
  readonly policy: RateLimitPolicy;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(KafkaService) private readonly kafka: KafkaService,
  ) {}

  async consume(
    policyKey: string,
    identity: string,
    role: string,
    route: string,
    attemptId: string | null = null,
  ): Promise<RateLimitDecision> {
    const policy = getRateLimitPolicy(policyKey);
    const windowMs = policy.windowSeconds * 1000;
    const now = Date.now();
    const key = policy.redisKey.replace('{id}', identity);

    try {
      const windowResult = (await this.redis.eval(
        SLIDING_WINDOW_LUA,
        1,
        key,
        String(policy.limit),
        String(windowMs),
        String(now),
        randomUUID(),
      )) as [number, number, number];

      let allowed = windowResult[0] === 1;
      const count = Number(windowResult[1]);
      let retryAfterMs = Number(windowResult[2]);

      if (!allowed && policy.burst > 0) {
        const burst = (await this.redis.eval(
          TOKEN_BUCKET_LUA,
          1,
          `${key}:burst`,
          String(policy.burst),
          String(policy.limit),
          String(windowMs),
          String(now),
        )) as [number, number, number];
        if (burst[0] === 1) {
          allowed = true;
          retryAfterMs = 0;
        } else {
          retryAfterMs = Math.max(retryAfterMs, Number(burst[2]));
        }
      }

      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
      rateLimitUtilisation.set({ policy: policyKey, role }, Math.min(1, count / policy.limit));
      if (!allowed) {
        rateLimitRejections.inc({ policy: policyKey, role, route });
        await this.publishExceeded(policy, identity, route, attemptId);
      }

      return {
        allowed,
        count,
        limit: policy.limit,
        retryAfterSeconds,
        resetAtEpochSeconds:
          Math.floor(now / 1000) + (allowed ? policy.windowSeconds : retryAfterSeconds),
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
        resetAtEpochSeconds: Math.floor(Date.now() / 1000) + policy.windowSeconds,
        policy,
      };
    }
  }

  private async publishExceeded(
    policy: RateLimitPolicy,
    identity: string,
    route: string,
    attemptId: string | null,
  ): Promise<void> {
    const event = RateLimitExceededEventSchema.parse({
      meta: {
        eventId: randomUUID(),
        eventType: SMART_TOPICS.rateLimitExceeded,
        version: 1,
        occurredAt: new Date().toISOString(),
        traceId: getContext()?.correlationId ?? randomUUID(),
        source: 'rate-limit',
      },
      data: {
        identifier: identity,
        scope: policy.scope,
        policyKey: policy.key,
        endpoint: route,
        limit: policy.limit,
        windowSeconds: policy.windowSeconds,
        violationsInWindow: 1,
        attemptId: isUuid(attemptId) ? attemptId : null,
      },
    });
    try {
      await this.kafka.emit(SMART_TOPICS.rateLimitExceeded, identity, event, 'rate-limit');
    } catch (error) {
      this.logger.warn(
        `Failed to publish ${SMART_TOPICS.rateLimitExceeded}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}

function isUuid(value: string | null): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}
