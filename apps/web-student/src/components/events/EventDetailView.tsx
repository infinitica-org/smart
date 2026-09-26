'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Alert, ErrorState, LoadingState, formatEventTime } from '@smart/ui';
import { SmartApiError } from '@smart/api-client';
import { api } from '@/lib/api';
import { EVENTS_KEY, RegistrationButton } from './RegistrationButton';

/** Th6-451 — one event: date in the event's timezone, place or link, seats left, and the register buttons. */
export function EventDetailView({ eventId }: { eventId: string }) {
  const query = useQuery({
    queryKey: [...EVENTS_KEY, 'detail', eventId],
    queryFn: () => api.campus.getEvent(eventId),
    retry: false,
  });

  if (query.isPending) return <LoadingState message="Loading event…" />;
  if (query.isError) {
    const missing = query.error instanceof SmartApiError && query.error.statusCode === 404;
    return (
      <ErrorState
        title={missing ? 'Event not found' : 'Could not load this event'}
        message={
          missing
            ? 'It may have been removed, or it is not open to you.'
            : query.error instanceof Error
              ? query.error.message
              : 'Try again.'
        }
        onRetry={missing ? undefined : () => void query.refetch()}
      />
    );
  }

  const event = query.data;
  return (
    <div className="space-y-4">
      <Link href="/events" className="text-sm text-zinc-600 hover:underline">
        ← All events
      </Link>
      {event.cancelled ? (
        <Alert tone="warning" role="status">
          This event was cancelled.
        </Alert>
      ) : null}
      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">{event.title}</h2>
            <p className="text-sm text-zinc-500">{event.institutionName}</p>
          </div>
          <RegistrationButton event={event} />
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-zinc-500">Starts</dt>
            <dd>{formatEventTime(event.startsAt, event.timezone)}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Ends</dt>
            <dd>{formatEventTime(event.endsAt, event.timezone)}</dd>
          </div>
          {event.location ? (
            <div>
              <dt className="text-xs text-zinc-500">Location</dt>
              <dd>{event.location}</dd>
            </div>
          ) : null}
          {event.onlineUrl ? (
            <div>
              <dt className="text-xs text-zinc-500">Online</dt>
              <dd>
                <a
                  href={event.onlineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 underline"
                >
                  Join link
                </a>
              </dd>
            </div>
          ) : null}
          {event.capacityLeft !== null ? (
            <div>
              <dt className="text-xs text-zinc-500">Seats left</dt>
              <dd>
                {event.capacityLeft === 0
                  ? 'None — new registrations join the waitlist'
                  : event.capacityLeft}
              </dd>
            </div>
          ) : null}
        </dl>
        {event.description ? (
          <p className="whitespace-pre-wrap text-sm text-zinc-700">{event.description}</p>
        ) : null}
      </div>
    </div>
  );
}
