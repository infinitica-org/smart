import { randomUUID } from 'node:crypto';
import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  ConnectSignalSourceRequestSchema,
  RawSignalEnvelopeSchema,
  REDIS_TTL_SECONDS,
  RefreshSignalsRequestSchema,
  SignalIngestedEventSchema,
  SMART_TOPICS,
  type ConnectableSignalSourceId,
  type ConnectSignalSourceRequest,
  type ConnectSignalSourceResponse,
  type ListSignalConnectionsResponse,
  type RefreshSignalsRequest,
  type RefreshSignalsResponse,
} from '@smart/contracts';
import { AuditPublisherService } from '../../platform/audit/audit-publisher.service.js';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { RedisService } from '../../platform/redis/redis.service.js';
import { AdapterRegistryService } from './adapter-registry.service.js';
import { SignalConnectionStore } from './signal-connection.store.js';

/**
 * Orchestrates passive signal connect/disconnect/refresh and Kafka ingestion.
 *
 * Never calls CorroborationService directly — boundary stays at Kafka.
 *
 * Owner: Vishal Bharath R.
 */
@Injectable()
export class SignalIngestionService {
  readonly owner = 'Vishal Bharath R';
  readonly purpose = 'Fetch and normalize external passive signals (GitHub, HackerRank, LeetCode).';

  private readonly logger = new Logger(SignalIngestionService.name);

  constructor(
    @Inject(AdapterRegistryService) private readonly registry: AdapterRegistryService,
    @Inject(SignalConnectionStore) private readonly connections: SignalConnectionStore,
    @Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService,
    @Inject(AuditPublisherService) private readonly audit: AuditPublisherService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  async listConnections(userId: string): Promise<ListSignalConnectionsResponse> {
    const rows = await this.connections.list(userId);
    return { connections: rows.map((row) => this.connections.toSummary(row)) };
  }

  async connect(
    userId: string,
    sourceId: ConnectableSignalSourceId,
    body: ConnectSignalSourceRequest,
  ): Promise<ConnectSignalSourceResponse> {
    const parsedBody = ConnectSignalSourceRequestSchema.parse(body);
    const adapter = this.registry.get(sourceId);
    const validated = await adapter.validateConnectInput(parsedBody);

    const now = new Date().toISOString();
    const stored = await this.connections.upsert({
      id: randomUUID(),
      userId,
      sourceId,
      externalAccountId: validated.externalAccountId,
      consentScopes: [validated.consentScope],
      status: 'ACTIVE',
      connectedAt: now,
      metadata: validated.metadata ?? {},
    });

    await this.audit.record({
      actorId: userId,
      action: 'signal.connection.created',
      resourceType: 'signal_connection',
      resourceId: stored.id,
      reasonCode: null,
      metadata: { sourceId, externalAccountId: stored.externalAccountId },
    });

    let fetchQueued = false;
    try {
      await this.ingest(userId, sourceId);
      fetchQueued = true;
    } catch (error) {
      this.logger.warn(
        `Initial fetch after connect failed for ${sourceId}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }

    return {
      connection: this.connections.toSummary(stored),
      fetchQueued,
    };
  }

  async disconnect(userId: string, sourceId: ConnectableSignalSourceId): Promise<void> {
    const existing = await this.connections.get(userId, sourceId);
    if (!existing) {
      throw new NotFoundException({
        error: 'signal_connection_not_found',
        message: `No ${sourceId} connection found.`,
        statusCode: 404,
      });
    }
    await this.connections.delete(userId, sourceId);
    await this.audit.record({
      actorId: userId,
      action: 'signal.connection.revoked',
      resourceType: 'signal_connection',
      resourceId: existing.id,
      reasonCode: null,
      metadata: { sourceId },
    });
  }

  async refresh(userId: string, body: RefreshSignalsRequest): Promise<RefreshSignalsResponse> {
    const parsed = RefreshSignalsRequestSchema.parse(body);
    const rows = await this.connections.list(userId);
    const active = rows.filter((row) => row.status === 'ACTIVE');
    const targetIds = parsed.sourceIds?.length
      ? parsed.sourceIds
      : active.map((row) => row.sourceId);

    const queued: ConnectableSignalSourceId[] = [];
    const skippedCooldown: ConnectableSignalSourceId[] = [];

    for (const sourceId of targetIds) {
      const connection = active.find((row) => row.sourceId === sourceId);
      if (!connection) continue;

      if (await this.isOnSourceCooldown(userId, sourceId)) {
        skippedCooldown.push(sourceId);
        continue;
      }

      try {
        await this.ingest(userId, sourceId);
        queued.push(sourceId);
      } catch (error) {
        this.logger.warn(
          `Refresh ingest failed for ${sourceId}: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }

    return { queued, skippedCooldown };
  }

  async ingest(userId: string, sourceId: ConnectableSignalSourceId): Promise<void> {
    const connection = await this.connections.get(userId, sourceId);
    if (!connection || connection.status === 'REVOKED') {
      throw new NotFoundException({
        error: 'signal_connection_not_found',
        message: `No active ${sourceId} connection found.`,
        statusCode: 404,
      });
    }

    if (await this.isDuplicateFetch(userId, sourceId)) {
      throw new ConflictException({
        error: 'signal_fetch_duplicate',
        message: 'A fetch for this source was already completed within the dedupe window.',
        statusCode: 409,
      });
    }

    const adapter = this.registry.get(sourceId);
    const consentScope = connection.consentScopes[0];
    if (!consentScope) {
      throw new ConflictException({
        error: 'missing_consent_scope',
        message: 'Connection has no consent scope recorded.',
        statusCode: 409,
      });
    }

    const fetchedAt = new Date().toISOString();
    try {
      const envelope = await adapter.fetchRaw({
        userId,
        externalAccountId: connection.externalAccountId,
        consentScope,
        metadata: connection.metadata,
      });
      const parsed = RawSignalEnvelopeSchema.parse(envelope);

      const event = SignalIngestedEventSchema.parse({
        meta: {
          eventId: randomUUID(),
          eventType: SMART_TOPICS.signalIngested,
          version: 1 as const,
          occurredAt: fetchedAt,
          traceId: randomUUID(),
          source: 'signal-ingestion',
        },
        data: parsed,
      });

      await this.outbox.enqueueEnvelope({
        topic: SMART_TOPICS.signalIngested,
        partitionKey: userId,
        eventType: SMART_TOPICS.signalIngested,
        source: 'signal-ingestion',
        data: event.data,
      });

      await this.connections.updateFetchResult(userId, sourceId, {
        lastFetchedAt: fetchedAt,
        lastError: null,
        status: 'ACTIVE',
      });
      await this.markSourceCooldown(userId, sourceId);
      await this.markDedupeFetch(userId, sourceId);

      await this.audit.record({
        actorId: userId,
        action: 'signal.fetch.completed',
        resourceType: 'signal_connection',
        resourceId: connection.id,
        reasonCode: null,
        metadata: { sourceId },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      await this.connections.updateFetchResult(userId, sourceId, {
        lastFetchedAt: fetchedAt,
        lastError: message,
        status: 'ERROR',
      });
      await this.audit.record({
        actorId: userId,
        action: 'signal.fetch.failed',
        resourceType: 'signal_connection',
        resourceId: connection.id,
        reasonCode: 'fetch_failed',
        metadata: { sourceId, message },
      });
      throw error;
    }
  }

  private dedupeKey(userId: string, sourceId: ConnectableSignalSourceId): string {
    const hour = new Date().toISOString().slice(0, 13).replace(/[-:T]/g, '');
    return `signal-ingestion:fetch:${userId}:${sourceId}:${hour}`;
  }

  private cooldownKey(userId: string, sourceId: ConnectableSignalSourceId): string {
    return `signal-ingestion:cooldown:${userId}:${sourceId}`;
  }

  private async isDuplicateFetch(
    userId: string,
    sourceId: ConnectableSignalSourceId,
  ): Promise<boolean> {
    try {
      const hit = await this.redis.get(this.dedupeKey(userId, sourceId));
      return hit === '1';
    } catch {
      return false;
    }
  }

  private async markDedupeFetch(
    userId: string,
    sourceId: ConnectableSignalSourceId,
  ): Promise<void> {
    try {
      await this.redis.setex(
        this.dedupeKey(userId, sourceId),
        REDIS_TTL_SECONDS.signalIngestionDedupe,
        '1',
      );
    } catch {
      /* best effort */
    }
  }

  private async isOnSourceCooldown(
    userId: string,
    sourceId: ConnectableSignalSourceId,
  ): Promise<boolean> {
    try {
      const hit = await this.redis.get(this.cooldownKey(userId, sourceId));
      return hit === '1';
    } catch {
      return false;
    }
  }

  private async markSourceCooldown(
    userId: string,
    sourceId: ConnectableSignalSourceId,
  ): Promise<void> {
    try {
      await this.redis.setex(
        this.cooldownKey(userId, sourceId),
        REDIS_TTL_SECONDS.signalSourceCooldown,
        '1',
      );
    } catch {
      /* best effort */
    }
  }
}
