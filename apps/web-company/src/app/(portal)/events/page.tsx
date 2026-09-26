'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@smart/api-client';
import type { PublicCareerEvent } from '@smart/contracts';
import { Alert, EmptyState, ErrorState, LoadingState, formatEventRange } from '@smart/ui';
import { api } from '@/lib/api';
import { Badge, PageHeader } from '../../../components/ui';
import { card, pageStack, primaryButton, secondaryButton } from '../../../lib/ui';

/**
 * Th6-450 — events at universities that approved this employer. Register, see Waitlisted, or cancel.
 * Registering twice is harmless: the server returns the existing registration.
 */
export default function UniversityEventsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.events({ scope: 'employer' }),
    queryFn: () => api.campus.employerEvents(),
    retry: false,
  });
  const [error, setError] = useState<string | undefined>();

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.events({ scope: 'employer' }) });
  const register = useMutation({
    mutationFn: (eventId: string) => api.campus.registerForEvent(eventId),
    onSuccess: refresh,
    onError: (failure) =>
      setError(failure instanceof Error ? failure.message : 'Could not register.'),
  });
  const cancel = useMutation({
    mutationFn: (eventId: string) => api.campus.cancelEventRegistration(eventId),
    onSuccess: refresh,
    onError: (failure) =>
      setError(failure instanceof Error ? failure.message : 'Could not cancel your registration.'),
  });
  const pendingId = register.isPending
    ? register.variables
    : cancel.isPending
      ? cancel.variables
      : null;

  return (
    <div className={pageStack}>
      <PageHeader
        title="University events"
        description="Career events at universities where you have campus access."
      />
      {error ? <Alert tone="danger">{error}</Alert> : null}

      {query.isPending ? (
        <LoadingState message="Loading events…" />
      ) : query.isError ? (
        <ErrorState
          title="Could not load events"
          message={query.error instanceof Error ? query.error.message : 'Try again.'}
          onRetry={() => void query.refetch()}
        />
      ) : query.data.events.length === 0 ? (
        <EmptyState
          title="No upcoming events"
          description="Events open to employers at your approved universities will show up here."
        />
      ) : (
        <ul className="space-y-3">
          {query.data.events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              busy={pendingId === event.id}
              onRegister={() => {
                setError(undefined);
                register.mutate(event.id);
              }}
              onCancel={() => {
                setError(undefined);
                cancel.mutate(event.id);
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function EventCard({
  event,
  busy,
  onRegister,
  onCancel,
}: {
  event: PublicCareerEvent;
  busy: boolean;
  onRegister: () => void;
  onCancel: () => void;
}) {
  const full = event.capacityLeft === 0;
  return (
    <li className={`${card} flex flex-wrap items-start justify-between gap-4 p-4`}>
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-[var(--ds-text)]">{event.title}</h2>
          {event.cancelled ? <Badge tone="red">Cancelled</Badge> : null}
        </div>
        <p className="text-[13px] text-[var(--ds-text-muted)]">{event.institutionName}</p>
        <p className="text-[13px] text-[var(--ds-text-secondary)]">
          {formatEventRange(event.startsAt, event.endsAt, event.timezone)}
        </p>
        <p className="text-[13px] text-[var(--ds-text-secondary)]">
          {[event.location, event.onlineUrl].filter(Boolean).join(' · ')}
        </p>
        {event.capacityLeft !== null ? (
          <p className="text-[12px] text-[var(--ds-text-muted)]">
            {full
              ? 'Full — new registrations join the waitlist'
              : `${event.capacityLeft} seats left`}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {event.myRegistration === 'REGISTERED' ? <Badge tone="green">Registered</Badge> : null}
        {event.myRegistration === 'WAITLISTED' ? <Badge tone="amber">Waitlisted</Badge> : null}
        {event.cancelled ? null : event.myRegistration ? (
          <button type="button" className={secondaryButton} disabled={busy} onClick={onCancel}>
            {busy ? 'Cancelling…' : 'Cancel'}
          </button>
        ) : (
          <button type="button" className={primaryButton} disabled={busy} onClick={onRegister}>
            {busy ? 'Registering…' : full ? 'Join waitlist' : 'Register'}
          </button>
        )}
      </div>
    </li>
  );
}
