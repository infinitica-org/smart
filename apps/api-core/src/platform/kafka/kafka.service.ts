import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { Kafka, type Admin, type Consumer, type Producer } from 'kafkajs';
import {
  consumerGroupFor,
  deadLetterTopicFor,
  SMART_TOPICS,
  type SmartTopic,
} from '@smart/contracts';
import {
  CORRELATION_KAFKA_HEADER,
  getContext,
  kafkaConsumerLag,
  kafkaCorrelationHeaders,
  kafkaEventsConsumed,
  kafkaEventsProduced,
  LOG_EVENTS,
  logEvent,
} from '@smart/observability';
import { env } from '../config/env.js';

/** How often to recompute consumer-group lag against broker high-water marks. */
const LAG_POLL_INTERVAL_MS = 15_000;

export interface KafkaSubscribeParams {
  readonly topic: SmartTopic;
  /** Module name used for consumer group id and DLQ attribution. */
  readonly module: string;
  readonly handler: (payload: unknown, headers: Record<string, string>) => Promise<void>;
}

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private available = false;
  private readonly kafka = new Kafka({
    clientId: env.KAFKA_CLIENT_ID,
    brokers: env.KAFKA_BROKERS.split(',').map((broker) => broker.trim()),
  });

  readonly producer: Producer = this.kafka.producer();
  private readonly consumers: Consumer[] = [];
  private readonly subscriptions: Array<{ topic: string; groupId: string }> = [];
  private admin: Admin | null = null;
  private lagPollTimer: ReturnType<typeof setInterval> | null = null;

  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    await this.ensureConnected();
    if (!this.available) {
      logEvent(
        this.logger,
        'warn',
        LOG_EVENTS.KAFKA_EMIT_SKIPPED,
        { topic: 'connect', brokers: env.KAFKA_BROKERS },
        'Kafka is not reachable at boot; emits will retry on each call',
      );
    }
    this.lagPollTimer = setInterval(() => {
      this.pollConsumerLag().catch(() => {
        // Best-effort gauge; a failed poll just leaves the last known value.
      });
    }, LAG_POLL_INTERVAL_MS);
    this.lagPollTimer.unref?.();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.lagPollTimer) clearInterval(this.lagPollTimer);
    await Promise.all(this.consumers.map((consumer) => consumer.disconnect()));
    this.consumers.length = 0;
    if (this.admin) await this.admin.disconnect().catch(() => undefined);
    if (this.available) await this.producer.disconnect();
    this.available = false;
  }

  /**
   * Consumer lag, in messages, per (topic, consumer group): the gap between each
   * partition's high-water mark and that group's committed offset, summed.
   *
   * This is the signal a Kafka backpressure test is actually watching for — it
   * must keep working (best-effort, never throwing) even while a load test is
   * deliberately trying to make consumers fall behind.
   */
  private async pollConsumerLag(): Promise<void> {
    if (this.subscriptions.length === 0) return;
    if (!this.admin) this.admin = this.kafka.admin();

    for (const { topic, groupId } of this.subscriptions) {
      try {
        const [topicOffsets, groupOffsets] = await Promise.all([
          this.admin.fetchTopicOffsets(topic),
          this.admin.fetchOffsets({ groupId, topics: [topic] }),
        ]);
        const committedByPartition = new Map(
          (groupOffsets[0]?.partitions ?? []).map((p) => [p.partition, Number(p.offset)]),
        );
        let lag = 0;
        for (const partitionOffset of topicOffsets) {
          const highWaterMark = Number(partitionOffset.high);
          const committed = committedByPartition.get(partitionOffset.partition) ?? 0;
          // A never-committed partition (-1) has consumed nothing yet; do not
          // count its full backlog as "lag" or a fresh consumer group looks stuck.
          if (committed >= 0) lag += Math.max(0, highWaterMark - committed);
        }
        kafkaConsumerLag.set({ topic, consumer_group: groupId }, lag);
      } catch {
        // Broker/admin hiccup — skip this round, keep the last observed value.
      }
    }
  }

  async ensureConnected(): Promise<boolean> {
    if (this.available) return true;
    if (env.NODE_ENV === 'test') return false;
    try {
      await this.producer.connect();
      this.available = true;
      return true;
    } catch (error) {
      logEvent(
        this.logger,
        'warn',
        LOG_EVENTS.KAFKA_EMIT_SKIPPED,
        {
          topic: 'connect',
          brokers: env.KAFKA_BROKERS,
          err: error instanceof Error ? error.message : 'unknown',
        },
        'Kafka connect failed',
      );
      return false;
    }
  }

  async emit(topic: string, key: string, value: unknown, module: string): Promise<void> {
    const connected = await this.ensureConnected();
    if (!connected) {
      throw new Error(`Kafka unavailable; cannot emit ${topic}`);
    }

    const correlationId = getContext()?.correlationId;
    const headers = kafkaCorrelationHeaders(correlationId);

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key,
            value: JSON.stringify(value),
            ...(headers ? { headers } : {}),
          },
        ],
      });
      kafkaEventsProduced.inc({ topic, producer_module: module });
    } catch (error) {
      this.available = false;
      logEvent(
        this.logger,
        'error',
        LOG_EVENTS.KAFKA_EMIT_FAILED,
        {
          topic,
          [CORRELATION_KAFKA_HEADER]: correlationId,
          err: error instanceof Error ? error.message : 'unknown',
        },
        'Kafka emit failed',
      );
      throw error;
    }
  }

  async subscribe(params: KafkaSubscribeParams): Promise<void> {
    if (env.NODE_ENV === 'test') return;

    const groupId = consumerGroupFor(params.module, params.topic);
    const consumer = this.kafka.consumer({ groupId });
    this.consumers.push(consumer);
    this.subscriptions.push({ topic: params.topic, groupId });
    await consumer.connect();
    await consumer.subscribe({ topic: params.topic, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ message }) => {
        const value = message.value ? JSON.parse(message.value.toString()) : null;
        const headers: Record<string, string> = {};
        for (const [headerKey, headerValue] of Object.entries(message.headers ?? {})) {
          if (headerValue) headers[headerKey] = headerValue.toString();
        }
        try {
          await params.handler(value, headers);
          kafkaEventsConsumed.inc({
            topic: params.topic,
            consumer_group: groupId,
            outcome: 'success',
          });
        } catch (error) {
          kafkaEventsConsumed.inc({
            topic: params.topic,
            consumer_group: groupId,
            outcome: 'error',
          });
          logEvent(
            this.logger,
            'error',
            LOG_EVENTS.KAFKA_EMIT_FAILED,
            {
              topic: params.topic,
              err: error instanceof Error ? error.message : 'unknown',
            },
            `${params.topic} consumer failed; sending to DLQ`,
          );
          await this.emit(
            deadLetterTopicFor(params.topic),
            message.key?.toString() ?? 'unknown',
            { original: value, error: error instanceof Error ? error.message : 'unknown' },
            params.module,
          );
        }
      },
    });
  }

  async subscribeAssessmentSubmitted(
    handler: (
      payload: unknown,
      headers: Record<string, string | Buffer | undefined>,
    ) => Promise<void>,
  ): Promise<void> {
    await this.subscribe({
      topic: SMART_TOPICS.assessmentSubmitted,
      module: 'platform',
      handler: async (payload, headers) => handler(payload, headers),
    });
  }
}
