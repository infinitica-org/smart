'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  formatEventRange,
} from '@smart/ui';
import type {
  CareerEventDto,
  CareerEventStatus,
  CreateCareerEvent,
  UpdateCareerEvent,
} from '@smart/contracts';
import { api } from '../../lib/api';
import { EventForm } from './EventForm';

export const EVENT_STATUS_VARIANT = {
  DRAFT: 'secondary',
  PUBLISHED: 'success',
  CANCELLED: 'destructive',
} as const;

const FILTERS: { value: CareerEventStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

/**
 * Th6-448 — the university's events list and the "Create event" form. A draft keeps one Idempotency-Key
 * until it is saved, so a retry after a dropped connection can never create the event twice.
 */
export function EventsWorkspace() {
  const [status, setStatus] = useState<CareerEventStatus | ''>('');
  const [events, setEvents] = useState<CareerEventDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const idempotencyKey = useRef<string>(crypto.randomUUID());

  const load = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      setError(null);
      try {
        const page = await api.campus.listUniversityEvents({ status: status || undefined, cursor });
        setEvents((current) => (cursor ? [...current, ...page.events] : page.events));
        setNextCursor(page.nextCursor);
      } catch (failure) {
        if (!cursor) setEvents([]);
        setError(failure instanceof Error ? failure.message : 'Could not load events.');
      } finally {
        setLoading(false);
      }
    },
    [status],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function create(body: CreateCareerEvent | UpdateCareerEvent) {
    const created = await api.campus.createEvent(body as CreateCareerEvent, idempotencyKey.current);
    idempotencyKey.current = crypto.randomUUID();
    setCreating(false);
    setNotice(`"${created.title}" was saved as a draft. Open it to publish.`);
    await load();
  }

  return (
    <div className="space-y-4 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Event status" className="flex flex-wrap gap-2">
          {FILTERS.map((entry) => (
            <button
              key={entry.value || 'all'}
              type="button"
              role="tab"
              aria-selected={status === entry.value}
              onClick={() => setStatus(entry.value)}
              className={
                status === entry.value
                  ? 'rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white'
                  : 'rounded-full border border-zinc-200 px-4 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50'
              }
            >
              {entry.label}
            </button>
          ))}
        </div>
        <Button onClick={() => setCreating(true)}>Create event</Button>
      </div>

      {notice ? (
        <Alert tone="success" role="status">
          {notice}
        </Alert>
      ) : null}

      {error ? (
        <ErrorState title="Could not load events" message={error} onRetry={() => void load()} />
      ) : loading && events.length === 0 ? (
        <LoadingState message="Loading events…" />
      ) : events.length === 0 ? (
        <EmptyState
          title="No events yet"
          description="Create a career event for your students and approved employers."
        />
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
          {events.map((event) => (
            <li key={event.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <Link
                  href={`/events/${event.id}`}
                  className="font-semibold text-zinc-900 hover:underline"
                >
                  {event.title}
                </Link>
                <div className="text-xs text-zinc-500">
                  {formatEventRange(event.startsAt, event.endsAt, event.timezone)}
                  {event.location ? ` · ${event.location}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-600">
                <span>
                  {event.registeredCount}
                  {event.capacity ? ` / ${event.capacity}` : ''} registered
                  {event.waitlistedCount > 0 ? ` · ${event.waitlistedCount} waitlisted` : ''}
                </span>
                <Badge variant={EVENT_STATUS_VARIANT[event.status]}>
                  {event.status.toLowerCase()}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
      {nextCursor ? (
        <div className="text-center">
          <Button variant="ghost" disabled={loading} onClick={() => void load(nextCursor)}>
            {loading ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}

      <Modal open={creating} onClose={() => setCreating(false)} title="Create event" size="lg">
        <EventForm submitLabel="Save draft" onSubmit={create} onCancel={() => setCreating(false)} />
      </Modal>
    </div>
  );
}
