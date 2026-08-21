import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { Kafka, type Producer } from 'kafkajs';
import { kafkaEventsProduced } from '@smart/observability';
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
      this.logger.warn(
        `Kafka is not reachable at ${env.KAFKA_BROKERS}. Events will be skipped until it is. (${error instanceof Error ? error.message : 'unknown'})`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.available) await this.producer.disconnect();
  }

  async emit(topic: string, key: string, value: unknown, module: string): Promise<void> {
    if (!this.available) {
      this.logger.debug(`Skipping event ${topic} (Kafka down)`);
      return;
    }
    await this.producer.send({
      topic,
      messages: [{ key, value: JSON.stringify(value) }],
    });
    kafkaEventsProduced.inc({ topic, producer_module: module });
  }
}
