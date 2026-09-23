import { Inject, Injectable } from '@nestjs/common';
import type {
  ConnectableSignalSourceId,
  SignalConnectionStatus,
  SignalConnectionSummary,
} from '@smart/contracts';
import { RedisService } from '../../platform/redis/redis.service.js';

export interface StoredSignalConnection {
  readonly id: string;
  readonly userId: string;
  readonly sourceId: ConnectableSignalSourceId;
  readonly externalAccountId: string;
  readonly consentScopes: readonly string[];
  readonly status: SignalConnectionStatus;
  readonly connectedAt: string;
  readonly lastFetchedAt: string | null;
  readonly lastError: string | null;
  readonly metadata: Record<string, unknown>;
}

interface StoredSignalConnectionMutable extends StoredSignalConnection {
  consentScopes: string[];
  metadata: Record<string, unknown>;
}

function redisKey(userId: string, sourceId: ConnectableSignalSourceId): string {
  return `signal:conn:${userId}:${sourceId}`;
}

/**
 * Redis-backed external signal connection store until VV lands Prisma migration.
 *
 * Owner: Vishal Bharath R.
 */
@Injectable()
export class SignalConnectionStore {
  constructor(@Inject(RedisService) private readonly redis: RedisService) {}

  async list(userId: string): Promise<readonly StoredSignalConnection[]> {
    const sourceIds: ConnectableSignalSourceId[] = [
      'GITHUB',
      'HACKERRANK',
      'LEETCODE',
      'LINKEDIN',
      'CREDLY',
    ];
    const rows = await Promise.all(sourceIds.map((sourceId) => this.get(userId, sourceId)));
    return rows.filter((row): row is StoredSignalConnection => row !== null);
  }

  async get(
    userId: string,
    sourceId: ConnectableSignalSourceId,
  ): Promise<StoredSignalConnection | null> {
    try {
      const raw = await this.redis.get(redisKey(userId, sourceId));
      if (!raw) return null;
      return JSON.parse(raw) as StoredSignalConnection;
    } catch {
      return null;
    }
  }

  async upsert(
    row: Omit<StoredSignalConnection, 'lastFetchedAt' | 'lastError'> & {
      lastFetchedAt?: string | null;
      lastError?: string | null;
    },
  ): Promise<StoredSignalConnection> {
    const existing = await this.get(row.userId, row.sourceId);
    const stored: StoredSignalConnectionMutable = {
      id: row.id,
      userId: row.userId,
      sourceId: row.sourceId,
      externalAccountId: row.externalAccountId,
      consentScopes: [...row.consentScopes],
      status: row.status,
      connectedAt: row.connectedAt,
      lastFetchedAt: row.lastFetchedAt ?? existing?.lastFetchedAt ?? null,
      lastError: row.lastError ?? existing?.lastError ?? null,
      metadata: { ...(existing?.metadata ?? {}), ...(row.metadata ?? {}) },
    };
    await this.redis.set(redisKey(row.userId, row.sourceId), JSON.stringify(stored));
    return stored;
  }

  async updateFetchResult(
    userId: string,
    sourceId: ConnectableSignalSourceId,
    result: { lastFetchedAt: string; lastError?: string | null; status?: SignalConnectionStatus },
  ): Promise<void> {
    const existing = await this.get(userId, sourceId);
    if (!existing) return;
    const updated: StoredSignalConnection = {
      ...existing,
      lastFetchedAt: result.lastFetchedAt,
      lastError: result.lastError ?? null,
      status: result.status ?? existing.status,
    };
    await this.redis.set(redisKey(userId, sourceId), JSON.stringify(updated));
  }

  async delete(userId: string, sourceId: ConnectableSignalSourceId): Promise<boolean> {
    try {
      const deleted = await this.redis.del(redisKey(userId, sourceId));
      return deleted > 0;
    } catch {
      return false;
    }
  }

  toSummary(row: StoredSignalConnection): SignalConnectionSummary {
    return {
      sourceId: row.sourceId,
      externalAccountId: row.externalAccountId,
      consentScopes: [...row.consentScopes],
      connectedAt: row.connectedAt,
      lastFetchedAt: row.lastFetchedAt,
      status: row.status,
    };
  }
}
