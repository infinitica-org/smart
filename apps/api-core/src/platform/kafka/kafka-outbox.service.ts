import { randomUUID } from 'node:crypto';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  type AssessmentSubmittedEvent,
  AssessmentSubmittedEventSchema,
  SMART_TOPICS,
  type VerificationEventDto,
  type VerificationEventStatus,
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

  async listVerificationEvents(): Promise<VerificationEventDto[]> {
    const rows = await this.prisma.kafkaOutbox.findMany({
      where: {
        OR: [{ publishedAt: null }, { lastError: { not: null } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return rows.map((row) => {
      let status: VerificationEventStatus = 'PENDING';
      if (row.publishedAt !== null) {
        status = 'PUBLISHED';
      } else if (row.attempts > 0 || row.lastError !== null) {
        status = 'FAILED';
      }

      return {
        id: row.id,
        topic: row.topic,
        partitionKey: row.partitionKey,
        source: row.source,
        status,
        attempts: row.attempts,
        lastError: row.lastError,
        publishedAt: row.publishedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      };
    });
  }

  async retryEvent(id: string): Promise<VerificationEventDto> {
    const updated = await this.prisma.kafkaOutbox.updateMany({
      where: { id, publishedAt: null },
      data: { attempts: 0, lastError: null },
    });

    if (updated.count === 0) {
      const existing = await this.prisma.kafkaOutbox.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException({
          error: 'not_found',
          message: `Outbox event ${id} not found.`,
          statusCode: 404,
        });
      }
      if (existing.publishedAt !== null) {
        throw new NotFoundException({
          error: 'already_published',
          message: `Outbox event ${id} has already been published.`,
          statusCode: 400,
        });
      }
    }

    void this.drain();

    const row = await this.prisma.kafkaOutbox.findUniqueOrThrow({ where: { id } });
    return {
      id: row.id,
      topic: row.topic,
      partitionKey: row.partitionKey,
      source: row.source,
      status: 'PENDING',
      attempts: row.attempts,
      lastError: row.lastError,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
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
