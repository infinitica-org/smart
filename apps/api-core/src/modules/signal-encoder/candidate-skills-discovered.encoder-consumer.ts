import type { OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CandidateSkillsDiscoveredEventSchema,
  SignalEncodedEventSchema,
  SMART_TOPICS,
} from '@smart/contracts';
import { runKafkaHandler } from '@smart/observability';
import { env } from '../../platform/config/env.js';
import { KafkaOutboxService } from '../../platform/kafka/kafka-outbox.service.js';
import { KafkaService } from '../../platform/kafka/kafka.service.js';
import { CorroborationService } from '../corroboration/corroboration.service.js';
import { RuleBasedEncoder } from './rule-based.encoder.js';

/**
 * Encodes GitHub-derived onboarding signals into passive vectors (S6-RM-10).
 *
 * Owner: Ramansh.
 */
@Injectable()
export class CandidateSkillsDiscoveredEncoderConsumer implements OnModuleInit {
  private readonly logger = new Logger(CandidateSkillsDiscoveredEncoderConsumer.name);

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
        topic: SMART_TOPICS.candidateSkillsDiscovered,
        module: 'signal-encoder',
        handler: async (payload, headers) => {
          await runKafkaHandler(headers, async () => {
            const parsed = CandidateSkillsDiscoveredEventSchema.safeParse(payload);
            if (!parsed.success) {
              this.logger.warn('Ignored malformed candidate.skills_discovered payload for encoder');
              return;
            }

            const { userId, languages, selectedSkillNames } = parsed.data.data;
            const vector = this.encoder.encodeGithub({
              userId,
              languages,
              selectedSkillNames,
              encodedAt: parsed.data.meta.occurredAt,
            });

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
              partitionKey: userId,
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
        `signal-encoder consumer not started: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
