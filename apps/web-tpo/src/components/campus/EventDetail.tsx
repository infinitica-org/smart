'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
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
import { SmartApiError } from '@smart/api-client';
import type { CreateCareerEvent, UniversityEventDetail, UpdateCareerEvent } from '@smart/contracts';
import { api } from '../../lib/api';
import { EVENT_STATUS_VARIANT } from './EventsWorkspace';
import { EventForm } from './EventForm';
import { ReasonConfirmDialog } from './ReasonConfirmDialog';

/**
 * Th6-449 — one event: status, Publish / Edit / Cancel, and who registered. Edits carry the version the
 * page loaded (If-Match); if someone else changed the event meanwhile the page says so and reloads.
 */
export function EventDetail({ eventId }: { eventId: string }) {
  const [detail, setDetail] = useState<UniversityEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDetail(await api.campus.getUniversityEvent(eventId));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not load this event.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function publish() {
    setPublishing(true);
    setActionError(null);
    try {
      await api.campus.publishEvent(eventId);
      setNotice('The event is published.');
      await load();
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : 'Could not publish this event.');
    } finally {
      setPublishing(false);
    }
  }

  async function save(body: CreateCareerEvent | UpdateCareerEvent) {
    if (!detail) return;
    try {
      await api.campus.updateEvent(eventId, detail.event.version, body as UpdateCareerEvent);
    } catch (failure) {
      if (failure instanceof SmartApiError && failure.statusCode === 409) {
        setEditing(false);
        setActionError(
          'Someone else changed this event. It has been reloaded; review it and edit again.',
        );
        await load();
        return;
      }
      throw failure;
    }
    setEditing(false);
    setNotice('Changes saved. Registrants are told if the time or place changed.');
    await load();
  }

  async function cancel(reason: string) {
    await api.campus.cancelEvent(eventId, { reason });
    setCancelling(false);
    setNotice('The event was cancelled and registrants have been told.');
    await load();
  }

  if (error)
    return (
      <ErrorState title="Could not load this event" message={error} onRetry={() => void load()} />
    );
  if (loading && !detail) return <LoadingState message="Loading event…" />;
  if (!detail) return null;

  const { event, registrants } = detail;
  const cancelled = event.status === 'CANCELLED';

  return (
    <div className="space-y-4 pb-12">
      <Link href="/events" className="text-sm text-zinc-600 hover:underline">
        ← All events
      </Link>
      {notice ? (
        <Alert tone="success" role="status">
          {notice}
        </Alert>
      ) : null}
      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-zinc-900">{event.title}</h2>
              <Badge variant={EVENT_STATUS_VARIANT[event.status]}>
                {event.status.toLowerCase()}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-zinc-600">
              {formatEventRange(event.startsAt, event.endsAt, event.timezone)} ({event.timezone})
            </p>
            <p className="text-sm text-zinc-600">
              {[event.location, event.onlineUrl].filter(Boolean).join(' · ')}
            </p>
          </div>
          {!cancelled ? (
            <div className="flex gap-2">
              {event.status === 'DRAFT' ? (
                <Button onClick={() => void publish()} disabled={publishing}>
                  {publishing ? 'Publishing…' : 'Publish'}
                </Button>
              ) : null}
              <Button variant="outline" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button variant="outline" onClick={() => setCancelling(true)}>
                Cancel event
              </Button>
            </div>
          ) : null}
        </div>
        {event.description ? (
          <p className="mt-4 whitespace-pre-wrap text-sm text-zinc-700">{event.description}</p>
        ) : null}
        {cancelled && event.cancelReason ? (
          <p className="mt-4 text-sm text-red-700">Cancelled: {event.cancelReason}</p>
        ) : null}
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-zinc-500">Audience</dt>
            <dd>{event.audience.toLowerCase()}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Employers can register</dt>
            <dd>{event.employerRegistration ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Registered</dt>
            <dd>
              {event.registeredCount}
              {event.capacity ? ` of ${event.capacity}` : ''}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Waitlisted</dt>
            <dd>{event.waitlistedCount}</dd>
          </div>
        </dl>
      </div>

      <section aria-labelledby="registrants-heading" className="space-y-2">
        <h3 id="registrants-heading" className="text-sm font-semibold text-zinc-900">
          Registrants
        </h3>
        {registrants.length === 0 ? (
          <EmptyState
            title="No registrations yet"
            description="People who register will be listed here."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Registered</th>
                </tr>
              </thead>
              <tbody>
                {registrants.map((entry) => (
                  <tr key={entry.registrationId} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-3">
                      {entry.fullName}
                      {entry.companyName ? (
                        <span className="text-zinc-500"> · {entry.companyName}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {entry.kind === 'EMPLOYER' ? 'Employer' : 'Student'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={entry.status === 'REGISTERED' ? 'success' : 'warning'}>
                        {entry.status.toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(entry.registeredAt).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit event" size="lg">
        <EventForm
          event={event}
          submitLabel="Save changes"
          onSubmit={save}
          onCancel={() => setEditing(false)}
        />
      </Modal>

      <ReasonConfirmDialog
        open={cancelling}
        title="Cancel this event?"
        description="Everyone registered is told it was cancelled. This cannot be undone."
        confirmText="Cancel event"
        onClose={() => setCancelling(false)}
        onSubmit={cancel}
      />
    </div>
  );
}
