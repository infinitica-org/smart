'use client';

import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Badge, Button, EmptyState, ErrorState, LoadingState, formatEventRange } from '@smart/ui';
import { api } from '@/lib/api';
import { EVENTS_KEY, RegistrationButton } from './RegistrationButton';

/** Th6-451 — upcoming career events from the student's own university, soonest first. */
export function EventsList() {
  const query = useInfiniteQuery({
    queryKey: [...EVENTS_KEY, 'list'],
    queryFn: ({ pageParam }) => api.campus.listEvents({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    retry: false,
  });

  if (query.isPending) return <LoadingState message="Loading events…" />;
  if (query.isError) {
    return (
      <ErrorState
        title="Could not load events"
        message={query.error instanceof Error ? query.error.message : 'Try again.'}
        onRetry={() => void query.refetch()}
      />
    );
  }
  const events = query.data.pages.flatMap((page) => page.events);
  if (events.length === 0) {
    return (
      <EmptyState
        title="No upcoming events"
        description="When your university publishes a career event, it will show up here."
      />
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {events.map((event) => (
          <li
            key={event.id}
            className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/events/${event.id}`}
                  className="font-semibold text-zinc-900 hover:underline"
                >
                  {event.title}
                </Link>
                {event.cancelled ? <Badge variant="destructive">Cancelled</Badge> : null}
              </div>
              <p className="text-sm text-zinc-600">
                {formatEventRange(event.startsAt, event.endsAt, event.timezone)}
              </p>
              <p className="text-sm text-zinc-600">
                {[event.location, event.onlineUrl ? 'Online' : null].filter(Boolean).join(' · ')}
              </p>
              {event.capacityLeft !== null && !event.cancelled ? (
                <p className="text-xs text-zinc-500">
                  {event.capacityLeft === 0
                    ? 'Full — you can join the waitlist'
                    : `${event.capacityLeft} seats left`}
                </p>
              ) : null}
            </div>
            <RegistrationButton event={event} />
          </li>
        ))}
      </ul>
      {query.hasNextPage ? (
        <div className="text-center">
          <Button
            variant="ghost"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
