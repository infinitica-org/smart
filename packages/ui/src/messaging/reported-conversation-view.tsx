'use client';

import { useState } from 'react';
import { ADMIN_ACCESS_REASON_MIN_LENGTH } from '@smart/contracts';
import { useQuery, useSmartApi } from '../api-provider';
import { Alert } from '../components/alert';
import { Button } from '../components/button';
import { ErrorState, LoadingState } from '../components/common-states';
import { Modal } from '../components/modal';
import { cn } from '../lib/cn';
import { MessageText, messageErrorText } from './messaging-utils';

const timeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Th6-430 — "View conversation" on an admin report. The reason is asked first and sent with the request,
 * because the server audits every read. The thread is read-only: there is no composer and no actions.
 */
export function ReportedConversationView({ reportId }: { reportId: string }) {
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const api = useSmartApi();
  const tooShort = reason.trim().length < ADMIN_ACCESS_REASON_MIN_LENGTH;

  const view = useQuery({
    queryKey: ['messaging', 'admin', reportId, submitted],
    queryFn: () => api.messaging.adminConversation(reportId, { reason: submitted ?? '' }),
    enabled: submitted !== null,
    retry: false,
    // One audited read per reason; do not silently re-read on focus.
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  return (
    <div>
      <Button variant="outline" onClick={() => setAsking(true)}>
        View conversation
      </Button>
      <Modal
        open={asking && submitted === null}
        onClose={() => setAsking(false)}
        title="Why do you need to read this conversation?"
        description="Your reason is recorded in the audit log together with this access."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAsking(false)}>
              Cancel
            </Button>
            <Button
              disabled={tooShort}
              onClick={() => {
                setSubmitted(reason.trim());
                setAsking(false);
              }}
            >
              Open conversation
            </Button>
          </div>
        }
      >
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          aria-label="Reason for access"
          className="w-full rounded-lg border border-neutral-300 bg-white p-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <p className="mt-1 text-xs text-neutral-500">
          At least {ADMIN_ACCESS_REASON_MIN_LENGTH} characters.
        </p>
      </Modal>

      {submitted !== null && view.isLoading ? (
        <LoadingState message="Opening conversation…" />
      ) : null}
      {view.error ? (
        <ErrorState message={messageErrorText(view.error)} onRetry={() => void view.refetch()} />
      ) : null}
      {view.data ? (
        <section
          className="mt-4 rounded-xl border border-neutral-200 dark:border-neutral-800"
          aria-label="Reported conversation"
        >
          <header className="border-b border-neutral-200 px-4 py-3 text-sm dark:border-neutral-800">
            <p className="font-semibold">
              Read-only view · report reason: {view.data.reportReason}
            </p>
            <p className="text-xs text-neutral-500">
              {view.data.participants
                .map(
                  (p) => `${p.name} (${p.role.toLowerCase()}${p.orgName ? `, ${p.orgName}` : ''})`,
                )
                .join(' · ')}
            </p>
          </header>
          <ul className="space-y-3 px-4 py-3">
            {view.data.messages.map((m) => (
              <li
                key={m.id}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm',
                  m.reported
                    ? 'border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/30'
                    : 'border-neutral-200 dark:border-neutral-800',
                )}
              >
                <p className="text-xs text-neutral-500">
                  {m.senderName} · {timeFormat.format(new Date(m.createdAt))}
                  {m.reported ? ' · REPORTED' : ''}
                  {m.deletedByParticipant ? ' · deleted by sender' : ''}
                </p>
                <MessageText text={m.body || '[content no longer retained]'} />
              </li>
            ))}
          </ul>
          <Alert tone="info" className="m-3">
            This view is read-only. You cannot send, edit or delete messages here.
          </Alert>
        </section>
      ) : null}
    </div>
  );
}
