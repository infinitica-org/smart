'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  JOINING_OUTCOMES,
  OFFER_OUTCOMES,
  type EmployerApplicantCard,
  type JoiningOutcome,
  type OfferOutcome,
} from '@smart/contracts';
import { SmartApiError } from '@smart/api-client';
import { Alert, Button, StartConversationDialog } from '@smart/ui';
import { api } from '@/lib/api';

const OFFER_LABEL: Record<OfferOutcome, string> = {
  ACCEPTED: 'Offer accepted',
  DECLINED: 'Offer declined',
  WITHDRAWN_BY_COMPANY: 'Offer withdrawn by us',
};
const JOINING_LABEL: Record<JoiningOutcome, string> = {
  JOINED: 'Joined',
  NO_SHOW: 'Did not show up',
  DEFERRED: 'Joining deferred',
};

function messageOf(error: unknown): string {
  return error instanceof SmartApiError ? error.message : 'Something went wrong. Try again.';
}

/**
 * Th6-416/417/420 — internal notes, recruiter assignment and offer/joining outcomes for one candidate.
 * Everything here is company-internal: students never see it. Each save reuses one Idempotency-Key per
 * attempt, so a double click or a retry records it once.
 */
export function CandidatePanel({
  applicant,
  onClose,
}: {
  applicant: EmployerApplicantCard;
  onClose: () => void;
}) {
  const id = applicant.applicationId;
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [messaging, setMessaging] = useState(false);

  const notes = useQuery({
    queryKey: ['employer', 'notes', id],
    queryFn: () => api.employer.listCandidateNotes(id),
    retry: false,
  });
  // Th6-429: an unverified company cannot message students, so say so up front (the API enforces it too).
  const account = useQuery({
    queryKey: ['company', 'account'],
    queryFn: () => api.auth.companyAccount(),
    retry: false,
  });
  const unverified =
    account.data !== undefined && account.data.companyVerificationStatus !== 'APPROVED';
  const members = useQuery({
    queryKey: ['employer', 'members'],
    queryFn: () => api.employer.listMembers(),
    retry: false,
  });

  const addNote = useMutation({
    mutationFn: (body: string) => api.employer.addCandidateNote(id, { body }, crypto.randomUUID()),
    onSuccess: () => {
      setDraft('');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['employer', 'notes', id] });
    },
    onError: (e) => setError(messageOf(e)),
  });
  const assign = useMutation({
    mutationFn: (assigneeId: string | null) =>
      api.employer.assignRecruiter(id, { assigneeId }, crypto.randomUUID()),
    onSuccess: () => setError(null),
    onError: (e) => setError(messageOf(e)),
  });
  const outcome = useMutation({
    mutationFn: (body: { offerOutcome?: OfferOutcome; joiningOutcome?: JoiningOutcome }) =>
      api.employer.recordOutcome(id, body, crypto.randomUUID()),
    onSuccess: () => setError(null),
    onError: (e) => setError(messageOf(e)),
  });

  const canRecordOffer = applicant.status === 'OFFERED' || applicant.status === 'HIRED';
  const canRecordJoining = applicant.status === 'HIRED';
  const activeMembers = members.data?.members.filter((m) => m.status === 'ACTIVE') ?? [];

  return (
    <section
      aria-label={`Details for ${applicant.candidateName}`}
      className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{applicant.candidateName}</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-sm font-semibold underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
            onClick={() => setMessaging(true)}
            disabled={unverified}
            aria-describedby={unverified ? 'message-unverified-note' : undefined}
          >
            Message
          </button>
          <button type="button" className="text-sm font-semibold underline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {unverified ? (
        <p id="message-unverified-note" className="mt-2 text-xs text-zinc-600">
          Your company must be verified before you can message students.{' '}
          <a href="/company" className="underline">
            Complete verification
          </a>
        </p>
      ) : null}

      {messaging ? (
        <StartConversationDialog
          open
          onClose={() => setMessaging(false)}
          target={{ applicationId: id }}
          recipientName={applicant.candidateName}
          onStarted={(conversationId) =>
            window.location.assign(`/messages?conversation=${conversationId}`)
          }
          verificationHint={
            <a href="/company" className="underline">
              Complete company verification
            </a>
          }
        />
      ) : null}

      {error ? (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      ) : null}

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <h3 className="text-sm font-semibold">Recruiter</h3>
          <select
            aria-label="Assign recruiter"
            className="mt-1 h-9 w-full rounded-lg border border-zinc-200 bg-white px-2 text-sm"
            defaultValue=""
            disabled={assign.isPending || members.isPending}
            onChange={(e) => assign.mutate(e.target.value || null)}
          >
            <option value="">Unassigned</option>
            {activeMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
          </select>
          {assign.isSuccess ? (
            <p className="mt-1 text-xs text-zinc-500" role="status">
              {assign.data.assigneeName ? `Assigned to ${assign.data.assigneeName}` : 'Unassigned'}
            </p>
          ) : null}
        </div>

        <div>
          <h3 className="text-sm font-semibold">Offer and joining</h3>
          {canRecordOffer ? (
            <select
              aria-label="Offer outcome"
              className="mt-1 h-9 w-full rounded-lg border border-zinc-200 bg-white px-2 text-sm"
              defaultValue=""
              disabled={outcome.isPending}
              onChange={(e) =>
                e.target.value && outcome.mutate({ offerOutcome: e.target.value as OfferOutcome })
              }
            >
              <option value="">Offer outcome…</option>
              {OFFER_OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {OFFER_LABEL[o]}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-1 text-xs text-zinc-500">Available once the candidate has an offer.</p>
          )}
          {canRecordJoining ? (
            <select
              aria-label="Joining outcome"
              className="mt-2 h-9 w-full rounded-lg border border-zinc-200 bg-white px-2 text-sm"
              defaultValue=""
              disabled={outcome.isPending}
              onChange={(e) =>
                e.target.value &&
                outcome.mutate({ joiningOutcome: e.target.value as JoiningOutcome })
              }
            >
              <option value="">Joining outcome…</option>
              {JOINING_OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {JOINING_LABEL[o]}
                </option>
              ))}
            </select>
          ) : null}
          {outcome.isSuccess ? (
            <p className="mt-1 text-xs text-zinc-500" role="status">
              Saved
            </p>
          ) : null}
        </div>

        <div>
          <h3 className="text-sm font-semibold">Internal notes</h3>
          <p className="text-xs text-zinc-500">Only your team sees these.</p>
          <textarea
            aria-label="New note"
            className="mt-1 w-full rounded-lg border border-zinc-200 p-2 text-sm"
            rows={3}
            maxLength={2000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button
            variant="outline"
            disabled={addNote.isPending || draft.trim().length === 0}
            onClick={() => addNote.mutate(draft.trim())}
          >
            {addNote.isPending ? 'Saving…' : 'Add note'}
          </Button>
          <ul className="mt-2 space-y-2">
            {notes.isPending ? <li className="text-xs text-zinc-500">Loading notes…</li> : null}
            {notes.isError ? <li className="text-xs text-red-700">Could not load notes.</li> : null}
            {notes.data?.notes.length === 0 ? (
              <li className="text-xs text-zinc-500">No notes yet.</li>
            ) : null}
            {notes.data?.notes.map((note) => (
              <li key={note.id} className="rounded-lg bg-zinc-50 p-2 text-sm">
                <p>{note.body}</p>
                <p className="text-xs text-zinc-500">{note.authorName}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
