import type { EventRegistrationStatus } from '@smart/contracts';
import { createNotices, writeAudit, type Db } from './campus-shared.js';

/** Registrations that still count toward attendance and receive event notices. */
export const ACTIVE_REGISTRATION_STATUSES: readonly EventRegistrationStatus[] = [
  'REGISTERED',
  'WAITLISTED',
];

/**
 * Serialises every seat change for one event. All capacity decisions run after this lock, so two
 * concurrent registrations for the last seat can never both be REGISTERED.
 */
export async function lockEvent(tx: Db, eventId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM career_events WHERE id = ${eventId}::uuid FOR UPDATE`;
}

/**
 * Promotes the oldest waitlisted registrations while seats are free, notifying each promoted person once.
 * Caller must hold the event lock. Returns how many were promoted.
 */
export async function fillFreeSeats(
  tx: Db,
  event: { id: string; title: string; capacity: number | null; institutionId: string },
  cause: string,
): Promise<number> {
  if (event.capacity === null) return 0;
  const registered = await tx.eventRegistration.count({
    where: { eventId: event.id, status: 'REGISTERED' },
  });
  const free = event.capacity - registered;
  if (free <= 0) return 0;

  const next = await tx.eventRegistration.findMany({
    where: { eventId: event.id, status: 'WAITLISTED' },
    orderBy: [{ registeredAt: 'asc' }, { id: 'asc' }],
    take: free,
  });
  for (const registration of next) {
    await tx.eventRegistration.update({
      where: { id: registration.id },
      data: { status: 'REGISTERED' },
    });
    await writeAudit(tx, {
      actorId: registration.userId,
      action: 'event_registration.promoted',
      resourceType: 'event_registration',
      resourceId: registration.id,
      orgId: event.institutionId,
      before: { status: 'WAITLISTED' },
      after: { status: 'REGISTERED', eventId: event.id, cause },
    });
  }
  await createNotices(
    tx,
    next.map((registration) => ({
      userId: registration.userId,
      kind: 'EVENT' as const,
      title: `You are in: ${event.title}`,
      body: 'A seat opened up and your waitlisted registration is now confirmed.',
      linkUrl: `/events/${event.id}`,
      // A person can be promoted more than once over time (cancel, re-register, wait again); `cause`
      // identifies the specific seat-freeing change, so a retry of the same change never notifies twice.
      dedupeKey: `event:${event.id}:promoted:${registration.id}:${cause}`,
      metadata: { eventId: event.id },
    })),
  );
  return next.length;
}
