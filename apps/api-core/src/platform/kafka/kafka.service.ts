import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { Kafka, type Producer } from 'kafkajs';
import {
  CORRELATION_KAFKA_HEADER,
  getContext,
  kafkaCorrelationHeaders,
  kafkaEventsProduced,
  LOG_EVENTS,
  logEvent,
} from '@smart/observability';
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

  async onModuleInit(): Promise<void> {
    if (env.NODE_ENV === 'test') return;
    try {
      await this.producer.connect();
      this.available = true;
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
        'Kafka is not reachable; events will be skipped until it is',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.available) await this.producer.disconnect();
  }

  async emit(topic: string, key: string, value: unknown, module: string): Promise<void> {
    if (!this.available) {
      logEvent(
        this.logger,
        'debug',
        LOG_EVENTS.KAFKA_EMIT_SKIPPED,
        { topic },
        'Skipping event (Kafka down)',
      );
      return;
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
}
