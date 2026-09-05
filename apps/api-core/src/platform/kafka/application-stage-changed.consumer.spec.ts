import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { SMART_TOPICS } from '@smart/contracts';
import { ApplicationStageChangedConsumer } from './application-stage-changed.consumer.js';

const applicationId = randomUUID();
const studentId = randomUUID();
const openingId = randomUUID();

function storedApplication() {
  return {
    id: applicationId,
    openingId,
    studentId,
    student: { id: studentId, email: 'aarav@example.com', fullName: 'Aarav Sharma' },
    opening: { companyName: 'Infinitica Labs', roleTitle: 'Backend Engineer' },
  };
}

function envelope(fromStage: string | null, toStage: string) {
  return {
    meta: {
      eventId: randomUUID(),
      eventType: SMART_TOPICS.applicationStageChanged,
      version: 1,
      occurredAt: '2026-09-05T00:00:00.000Z',
      traceId: randomUUID(),
      source: 'placement',
    },
    data: {
      applicationId,
      openingId,
      studentId,
      fromStage,
      toStage,
      changedAt: '2026-09-05T00:00:00.000Z',
    },
  };
}

function setup(applicationRow: unknown = storedApplication()) {
  const prisma = {
    application: { findUnique: vi.fn().mockResolvedValue(applicationRow) },
  };
  const notifications = {
    notifyOpportunityShortlisted: vi.fn().mockResolvedValue(undefined),
    notifyStageChange: vi.fn().mockResolvedValue(undefined),
  };
  const kafka = { subscribe: vi.fn() };
  const consumer = new ApplicationStageChangedConsumer(
    kafka as never,
    notifications as never,
    prisma as never,
  );
  return { consumer, prisma, notifications };
}

describe('CO-T05 application stage changed -> candidate notification', () => {
  it('sends the opportunity-shortlisted notification for the initial shortlist move', async () => {
    const { consumer, notifications } = setup();

    await consumer.handleStageChanged(envelope('APPLIED', 'SHORTLISTED'));

    expect(notifications.notifyOpportunityShortlisted).toHaveBeenCalledWith(
      expect.objectContaining({ userId: studentId, openingId, applicationId }),
    );
    expect(notifications.notifyStageChange).not.toHaveBeenCalled();
  });

  it.each([
    ['SHORTLISTED', 'AI_VERIFIED'],
    ['AI_VERIFIED', 'INTERVIEW'],
    ['INTERVIEW', 'OFFER'],
    ['OFFER', 'HIRED'],
    ['INTERVIEW', 'REJECTED'],
    ['SHORTLISTED', 'WITHDRAWN'],
  ])('sends a generic stage-change notification for %s -> %s', async (fromStage, toStage) => {
    const { consumer, notifications } = setup();

    await consumer.handleStageChanged(envelope(fromStage, toStage));

    expect(notifications.notifyStageChange).toHaveBeenCalledWith(
      expect.objectContaining({ userId: studentId, fromStage, toStage, applicationId }),
    );
    expect(notifications.notifyOpportunityShortlisted).not.toHaveBeenCalled();
  });

  it('ignores a no-op event where fromStage equals toStage', async () => {
    const { consumer, notifications } = setup();

    await consumer.handleStageChanged(envelope('OFFER', 'OFFER'));

    expect(notifications.notifyStageChange).not.toHaveBeenCalled();
    expect(notifications.notifyOpportunityShortlisted).not.toHaveBeenCalled();
  });

  it('ignores a malformed payload without throwing', async () => {
    const { consumer, notifications } = setup();

    await expect(consumer.handleStageChanged({ garbage: true })).resolves.toBeUndefined();
    expect(notifications.notifyStageChange).not.toHaveBeenCalled();
  });

  it('ignores an event for an application that no longer exists', async () => {
    const { consumer, notifications } = setup(null);

    await consumer.handleStageChanged(envelope('APPLIED', 'SHORTLISTED'));

    expect(notifications.notifyOpportunityShortlisted).not.toHaveBeenCalled();
    expect(notifications.notifyStageChange).not.toHaveBeenCalled();
  });
});
