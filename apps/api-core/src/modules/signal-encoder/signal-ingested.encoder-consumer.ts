import type { OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  SignalEncodedEventSchema,
  SignalIngestedEventSchema,
  SMART_TOPICS,
  type RawSignalEnvelope,
} from '@smart/contracts';
import { runKafkaHandler } from '@smart/observability';
import { env } from '../../platform/config/env.js';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { KafkaService } from '../../platform/kafka/kafka.service.js';
import { CorroborationService } from '../corroboration/corroboration.service.js';
import { RuleBasedEncoder } from './rule-based.encoder.js';

/**
 * Encodes ingested raw passive signals into vectorized signals (S6-RM-12).
 *
 * Owner: Ramansh (implemented alongside VB ingestion handoff).
 */
@Injectable()
export class SignalIngestedEncoderConsumer implements OnModuleInit {
  private readonly logger = new Logger(SignalIngestedEncoderConsumer.name);

  constructor(
    @Inject(KafkaService) private readonly kafka: KafkaService,
    @Inject(KafkaOutboxService) private readonly outbox: KafkaOutboxService,
    @Inject(RuleBasedEncoder) private readonly encoder: RuleBasedEncoder,
    @Inject(CorroborationService) private readonly corroboration: CorroborationService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      await this.kafka.subscribe({
        topic: SMART_TOPICS.signalIngested,
        module: 'signal-encoder',
        handler: async (payload, headers) => {
          await runKafkaHandler(headers, async () => {
            const parsed = SignalIngestedEventSchema.safeParse(payload);
            if (!parsed.success) {
              this.logger.warn('Ignored malformed signal.ingested payload for encoder');
              return;
            }

            const envelope = parsed.data.data;
            const vector = this.encodeEnvelope(envelope);
            if (vector.entries.length === 0) return;

            const encodedEvent = SignalEncodedEventSchema.parse({
              meta: {
                eventId: crypto.randomUUID(),
                eventType: SMART_TOPICS.signalEncoded,
                version: 1 as const,
                occurredAt: new Date().toISOString(),
                traceId: parsed.data.meta.traceId,
                source: 'signal-encoder',
              },
              data: vector,
            });

            await this.outbox.enqueueEnvelope({
              topic: SMART_TOPICS.signalEncoded,
              partitionKey: envelope.userId,
              eventType: SMART_TOPICS.signalEncoded,
              source: 'signal-encoder',
              data: encodedEvent.data,
            });

            await this.corroboration.ingestPassiveSignal(vector);
          });
        },
      });
    } catch (error) {
      this.logger.warn(
        `signal-ingested encoder consumer not started: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  private encodeEnvelope(envelope: RawSignalEnvelope) {
    const encodedAt = new Date().toISOString();
    switch (envelope.payload.sourceId) {
      case 'GITHUB':
        return this.encoder.encodeGithub({
          userId: envelope.userId,
          languages: envelope.payload.languages,
          selectedSkillNames: envelope.payload.selectedSkillNames,
          encodedAt,
          consentScope: envelope.consentScope,
          fetchedAt: envelope.fetchedAt,
        });
      case 'HACKERRANK':
        return this.encoder.encodeHackerrank({
          userId: envelope.userId,
          payload: envelope.payload,
          consentScope: envelope.consentScope,
          fetchedAt: envelope.fetchedAt,
          encodedAt,
        });
      case 'LEETCODE':
        return this.encoder.encodeLeetcode({
          userId: envelope.userId,
          payload: envelope.payload,
          consentScope: envelope.consentScope,
          fetchedAt: envelope.fetchedAt,
          encodedAt,
        });
      default:
        throw new Error(
          `Unsupported ingested source: ${(envelope.payload as { sourceId: string }).sourceId}`,
        );
    }
  }
}
