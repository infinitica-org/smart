import { randomUUID } from 'node:crypto';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  type AssessmentSubmittedEvent,
  AssessmentSubmittedEventSchema,
  SMART_TOPICS,
} from '@smart/contracts';
import { getContext } from '@smart/observability';
import { env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { KafkaService } from './kafka.service.js';

@Injectable()
export class KafkaOutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaOutboxService.name);
  private draining = false;
  private timer: NodeJS.Timeout | undefined;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(KafkaService) private readonly kafka: KafkaService,
  ) {}

  onModuleInit(): void {
    if (env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => {
      void this.drain();
    }, 2_000);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async enqueue(params: {
    topic: string;
    partitionKey: string;
    payload: unknown;
    source: string;
  }): Promise<void> {
    await this.prisma.kafkaOutbox.create({
      data: {
        topic: params.topic,
        partitionKey: params.partitionKey,
        payload: params.payload as object,
        source: params.source,
        correlationId: getContext()?.correlationId ?? null,
      },
    });
  }

  async enqueueAssessmentSubmitted(event: AssessmentSubmittedEvent): Promise<void> {
    const parsed = AssessmentSubmittedEventSchema.parse(event);
    await this.enqueue({
      topic: SMART_TOPICS.assessmentSubmitted,
      partitionKey: parsed.data.attemptId,
      payload: parsed,
      source: 'assessment',
    });
  }

  async enqueueEnvelope(params: {
    topic: string;
    partitionKey: string;
    eventType: string;
    source: string;
    data: unknown;
  }): Promise<void> {
    await this.enqueue({
      topic: params.topic,
      partitionKey: params.partitionKey,
      source: params.source,
      payload: {
        meta: {
          eventId: randomUUID(),
          eventType: params.eventType,
          version: 1,
          occurredAt: new Date().toISOString(),
          traceId: getContext()?.correlationId ?? randomUUID(),
          source: params.source,
        },
        data: params.data,
      },
    });
  }

  async drain(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      const rows = await this.prisma.kafkaOutbox.findMany({
        where: { publishedAt: null },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });
      for (const row of rows) {
        try {
          await this.kafka.emit(row.topic, row.partitionKey, row.payload, row.source);
          await this.prisma.kafkaOutbox.update({
            where: { id: row.id },
            data: { publishedAt: new Date(), attempts: { increment: 1 }, lastError: null },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'unknown';
          await this.prisma.kafkaOutbox.update({
            where: { id: row.id },
            data: { attempts: { increment: 1 }, lastError: message.slice(0, 1_000) },
          });
          this.logger.warn(`Outbox publish failed for ${row.topic}: ${message}`);
        }
      }
    } catch (error) {
      this.logger.debug(
        `Outbox drain skipped: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    } finally {
      this.draining = false;
    }
  }
}
