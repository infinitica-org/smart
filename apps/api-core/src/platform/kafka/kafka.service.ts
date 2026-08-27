import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { Kafka, type Consumer, type Producer } from 'kafkajs';
import {
  CORRELATION_KAFKA_HEADER,
  getContext,
  kafkaCorrelationHeaders,
  kafkaEventsProduced,
  LOG_EVENTS,
  logEvent,
} from '@smart/observability';
import { consumerGroupFor, deadLetterTopicFor, SMART_TOPICS } from '@smart/contracts';
import { env } from '../config/env.js';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private available = false;
  private readonly kafka = new Kafka({
    clientId: env.KAFKA_CLIENT_ID,
    brokers: env.KAFKA_BROKERS.split(',').map((broker) => broker.trim()),
  });

  readonly producer: Producer = this.kafka.producer();
  private consumer: Consumer | undefined;

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
  }

  async onModuleDestroy(): Promise<void> {
    if (this.consumer) await this.consumer.disconnect();
    if (this.available) await this.producer.disconnect();
    this.available = false;
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

  async subscribeAssessmentSubmitted(
    handler: (
      payload: unknown,
      headers: Record<string, Buffer | string | undefined>,
    ) => Promise<void>,
  ): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    const topic = SMART_TOPICS.assessmentSubmitted;
    this.consumer = this.kafka.consumer({
      groupId: consumerGroupFor('platform', topic),
    });
    await this.consumer.connect();
    await this.consumer.subscribe({ topic, fromBeginning: false });
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const value = message.value ? JSON.parse(message.value.toString()) : null;
        const headers: Record<string, string> = {};
        for (const [headerKey, headerValue] of Object.entries(message.headers ?? {})) {
          if (headerValue) headers[headerKey] = headerValue.toString();
        }
        try {
          await handler(value, headers);
        } catch (error) {
          logEvent(
            this.logger,
            'error',
            LOG_EVENTS.KAFKA_EMIT_FAILED,
            {
              topic,
              err: error instanceof Error ? error.message : 'unknown',
            },
            'assessment.submitted consumer failed; sending to DLQ',
          );
          await this.emit(
            deadLetterTopicFor(topic),
            message.key?.toString() ?? 'unknown',
            { original: value, error: error instanceof Error ? error.message : 'unknown' },
            'platform',
          );
        }
      },
    });
  }
}
