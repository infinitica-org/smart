import { Inject, Injectable } from '@nestjs/common';
import {
  CorroborationReviewFlagSchema,
  CorroborationSnapshotSchema,
  VectorizedSignalSchema,
  type CorroborationReviewFlag,
  type CorroborationSnapshot,
  type VectorizedSignal,
} from '@smart/contracts';
import { RedisService } from '../../platform/redis/redis.service.js';

const SNAPSHOT_TTL_SECONDS = 7_776_000; // 90 days
const FLAG_TTL_SECONDS = 7_776_000;
const PROCESSED_EVENT_TTL_SECONDS = 604_800; // 7 days
const OUTBOX_DEBOUNCE_SECONDS = 30;
const PENDING_FLAGS_SET = 'corroboration:flags:pending';
const PENDING_FLAGS_ZSET = 'corroboration:flags:pending:z';

function snapshotKey(userId: string): string {
  return `corroboration:snapshot:${userId}`;
}

function flagKey(flagId: string): string {
  return `corroboration:flag:${flagId}`;
}

function passiveKey(userId: string): string {
  return `corroboration:passive:${userId}`;
}

function claimFlagKey(claimId: string, skillCode: string): string {
  return `corroboration:flag-claim:${claimId}:${skillCode}`;
}

function processedEventKey(claimId: string, eventId: string): string {
  return `corroboration:processed:${claimId}:${eventId}`;
}

function outboxDebounceKey(userId: string): string {
  return `corroboration:outbox-debounce:${userId}`;
}

/**
 * Redis-backed corroboration state (Prisma migration tracked separately — VV).
 *
 * Owner: Ramansh.
 */
@Injectable()
export class CorroborationRedisStore {
  constructor(@Inject(RedisService) private readonly redis: RedisService) {}

  async savePassiveSignal(signal: VectorizedSignal): Promise<void> {
    await this.redis.setex(passiveKey(signal.userId), SNAPSHOT_TTL_SECONDS, JSON.stringify(signal));
  }

  async getPassiveSignal(userId: string): Promise<VectorizedSignal | null> {
    const raw = await this.redis.get(passiveKey(userId));
    if (!raw) return null;
    const parsed = VectorizedSignalSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  }

  async getSnapshot(userId: string): Promise<CorroborationSnapshot | null> {
    const raw = await this.redis.get(snapshotKey(userId));
    if (!raw) return null;
    const parsed = CorroborationSnapshotSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  }

  async saveSnapshot(snapshot: CorroborationSnapshot): Promise<void> {
    await this.redis.setex(
      snapshotKey(snapshot.userId),
      SNAPSHOT_TTL_SECONDS,
      JSON.stringify(snapshot),
    );
  }

  async saveFlag(flag: CorroborationReviewFlag): Promise<void> {
    await this.redis.setex(flagKey(flag.id), FLAG_TTL_SECONDS, JSON.stringify(flag));
    if (!flag.resolvedAt) {
      const createdMs = new Date(flag.createdAt).getTime();
      await this.redis
        .multi()
        .sadd(PENDING_FLAGS_SET, flag.id)
        .zadd(PENDING_FLAGS_ZSET, createdMs, flag.id)
        .exec();
      if (flag.claimId) {
        await this.redis.setex(
          claimFlagKey(flag.claimId, flag.skillCode),
          FLAG_TTL_SECONDS,
          flag.id,
        );
      }
    }
  }

  async getFlag(flagId: string): Promise<CorroborationReviewFlag | null> {
    const raw = await this.redis.get(flagKey(flagId));
    if (!raw) return null;
    const parsed = CorroborationReviewFlagSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  }

  async getPendingFlagIdForClaim(claimId: string, skillCode: string): Promise<string | null> {
    return this.redis.get(claimFlagKey(claimId, skillCode));
  }

  async listPendingFlags(): Promise<CorroborationReviewFlag[]> {
    const ids = await this.redis.zrevrange(PENDING_FLAGS_ZSET, 0, -1);
    const flags: CorroborationReviewFlag[] = [];
    for (const id of ids) {
      const flag = await this.getFlag(id);
      if (flag && !flag.resolvedAt) {
        flags.push(flag);
      } else {
        await this.removePendingFlag(id);
      }
    }
    return flags;
  }

  async listPendingFlagsPaginated(
    page: number,
    pageSize: number,
  ): Promise<{ flags: CorroborationReviewFlag[]; total: number }> {
    const total = await this.redis.zcard(PENDING_FLAGS_ZSET);
    if (total === 0) return { flags: [], total: 0 };

    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    const ids = await this.redis.zrevrange(PENDING_FLAGS_ZSET, start, end);
    const flags: CorroborationReviewFlag[] = [];
    for (const id of ids) {
      const flag = await this.getFlag(id);
      if (flag && !flag.resolvedAt) flags.push(flag);
      else await this.removePendingFlag(id);
    }
    return { flags, total };
  }

  async resolveFlag(
    flagId: string,
    resolutionNote: string,
  ): Promise<CorroborationReviewFlag | null> {
    const flag = await this.getFlag(flagId);
    if (!flag || flag.resolvedAt) return null;

    const resolved: CorroborationReviewFlag = {
      ...flag,
      resolvedAt: new Date().toISOString(),
      resolutionNote,
    };
    await this.redis.setex(flagKey(flag.id), FLAG_TTL_SECONDS, JSON.stringify(resolved));
    await this.removePendingFlag(flagId);
    if (flag.claimId) {
      await this.redis.del(claimFlagKey(flag.claimId, flag.skillCode));
    }
    return resolved;
  }

  /** At-least-once Kafka dedupe — returns true when this event should be processed. */
  async tryClaimProcessedEvent(claimId: string, eventId: string): Promise<boolean> {
    const result = await this.redis.set(
      processedEventKey(claimId, eventId),
      '1',
      'EX',
      PROCESSED_EVENT_TTL_SECONDS,
      'NX',
    );
    return result === 'OK';
  }

  /** Coalesce corroboration.updated outbox emissions per user. */
  async tryAcquireOutboxDebounce(userId: string): Promise<boolean> {
    const result = await this.redis.set(
      outboxDebounceKey(userId),
      '1',
      'EX',
      OUTBOX_DEBOUNCE_SECONDS,
      'NX',
    );
    return result === 'OK';
  }

  private async removePendingFlag(flagId: string): Promise<void> {
    await this.redis
      .multi()
      .srem(PENDING_FLAGS_SET, flagId)
      .zrem(PENDING_FLAGS_ZSET, flagId)
      .exec();
  }
}
