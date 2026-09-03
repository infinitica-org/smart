import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuditRecordedDataSchema, SMART_TOPICS } from '@smart/contracts';
import { KafkaOutboxService } from '../kafka/kafka-outbox.service.js';

export interface AuditRecordParams {
  readonly actorId: string | null;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string | null;
  readonly reasonCode: string | null;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Publishes audit events to Kafka; the consumer persists to audit_logs.
 */
@Injectable()
export class AuditPublisherService {
  constructor(@Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService) {}

  async record(params: AuditRecordParams): Promise<void> {
    const data = AuditRecordedDataSchema.parse({
      actorId: params.actorId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      reasonCode: params.reasonCode,
      metadata: params.metadata ?? {},
      recordedAt: new Date().toISOString(),
    });

    await this.outbox.enqueueEnvelope({
      topic: SMART_TOPICS.auditRecorded,
      partitionKey: params.resourceId ?? params.actorId ?? randomUUID(),
      eventType: SMART_TOPICS.auditRecorded,
      source: 'audit',
      data,
    });
  }
}
