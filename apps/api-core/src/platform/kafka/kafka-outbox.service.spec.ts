import { describe, expect, it, vi } from 'vitest';
import { KafkaOutboxService } from './kafka-outbox.service.js';
import { SMART_TOPICS } from '@smart/contracts';

describe('KafkaOutboxService', () => {
  it('writes assessment.submitted to the outbox table', async () => {
    const create = vi.fn(async () => ({}));
    const prisma = { kafkaOutbox: { create } };
    const kafka = { emit: vi.fn() };
    const outbox = new KafkaOutboxService(prisma as never, kafka as never);

    const attemptId = '11111111-1111-4111-8111-111111111111';
    const studentId = '22222222-2222-4222-8222-222222222222';
    await outbox.enqueueAssessmentSubmitted({
      meta: {
        eventId: '33333333-3333-4333-8333-333333333333',
        eventType: SMART_TOPICS.assessmentSubmitted,
        version: 1,
        occurredAt: new Date().toISOString(),
        traceId: 'trace',
        source: 'assessment',
      },
      data: {
        attemptId,
        studentId,
        trackCode: 'MBA_FINANCE',
        levelNumber: 1,
        status: 'SUBMITTED',
        autoSubmitted: false,
        integrityFlag: 'CLEAN',
        submittedAt: new Date().toISOString(),
        responses: [],
      },
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          topic: SMART_TOPICS.assessmentSubmitted,
          partitionKey: attemptId,
          source: 'assessment',
        }),
      }),
    );
  });

  it('retries emit and marks rows published', async () => {
    const row = {
      id: '44444444-4444-4444-8444-444444444444',
      topic: SMART_TOPICS.assessmentSubmitted,
      partitionKey: 'k',
      payload: { ok: true },
      source: 'assessment',
    };
    const prisma = {
      kafkaOutbox: {
        findMany: vi.fn(async () => [row]),
        update: vi.fn(async () => row),
      },
    };
    const kafka = { emit: vi.fn(async () => undefined) };
    const outbox = new KafkaOutboxService(prisma as never, kafka as never);
    await outbox.drain();
    expect(kafka.emit).toHaveBeenCalledWith(
      SMART_TOPICS.assessmentSubmitted,
      'k',
      { ok: true },
      'assessment',
    );
    expect(prisma.kafkaOutbox.update).toHaveBeenCalled();
  });
});
