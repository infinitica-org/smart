'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@smart/api-client';
import type { EmployerCampusAccessRow } from '@smart/contracts';
import { Alert, EmptyState, ErrorState, LoadingState } from '@smart/ui';
import { api } from '@/lib/api';
import { createKeyTracker } from '@/lib/company-profile-form';
import { Badge, Modal, PageHeader } from '../../../components/ui';
import { card, pageStack, primaryButton, secondaryButton, textarea } from '../../../lib/ui';
import type { Tone } from '../../../lib/ui';

const STATUS: Record<EmployerCampusAccessRow['status'], { label: string; tone: Tone }> = {
  NONE: { label: 'Not requested', tone: 'neutral' },
  PENDING: { label: 'Pending', tone: 'amber' },
  APPROVED: { label: 'Approved', tone: 'green' },
  DENIED: { label: 'Denied', tone: 'red' },
  REVOKED: { label: 'Revoked', tone: 'red' },
};

/**
 * Th6-445 — ask a partner university for campus access and see where each request stands. Only verified
 * employers can send requests; the server enforces that, the disabled buttons only explain it.
 */
export default function CampusAccessPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.campusAccess(),
    queryFn: () => api.campus.employerCampusAccess(),
    retry: false,
  });
  const [target, setTarget] = useState<EmployerCampusAccessRow | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const keys = useRef(createKeyTracker());

  const send = useMutation({
    mutationFn: (row: EmployerCampusAccessRow) =>
      api.campus.requestCampusAccess(
        { institutionId: row.institutionId, message: message.trim() || undefined },
        keys.current.keyFor(`${row.institutionId}|${message.trim()}`),
      ),
    onSuccess: async () => {
      keys.current.reset();
      setNotice(`Request sent to ${target?.institutionName}.`);
      setTarget(null);
      setMessage('');
      await queryClient.invalidateQueries({ queryKey: queryKeys.campusAccess() });
    },
    onError: (failure) =>
      setError(failure instanceof Error ? failure.message : 'Could not send the request.'),
  });

  const data = query.data;

  return (
    <div className={pageStack}>
      <PageHeader
        title="Campus access"
        description="Ask a university to let you recruit on campus. Once it approves you, your jobs are visible to its students."
      />
      {notice ? (
        <Alert tone="success" role="status">
          {notice}
        </Alert>
      ) : null}
      {data && !data.canRequest ? (
        <Alert tone="warning">
          Only verified companies can request campus access. Finish company verification, then come
          back.
        </Alert>
      ) : null}

      {query.isPending ? (
        <LoadingState message="Loading universities…" />
      ) : query.isError ? (
        <ErrorState
          title="Could not load universities"
          message={query.error instanceof Error ? query.error.message : 'Try again.'}
          onRetry={() => void query.refetch()}
        />
      ) : data && data.universities.length === 0 ? (
        <EmptyState
          title="No partner universities yet"
          description="Universities that partner with SMART will be listed here."
        />
      ) : (
        <ul className={`${card} divide-y divide-[var(--ds-border-subtle)]`}>
          {data?.universities.map((row) => {
            const status = STATUS[row.status];
            const canAsk = data.canRequest && ['NONE', 'DENIED', 'REVOKED'].includes(row.status);
            return (
              <li
                key={row.institutionId}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--ds-text)]">{row.institutionName}</p>
                  {row.reason && (row.status === 'DENIED' || row.status === 'REVOKED') ? (
                    <p className="mt-0.5 text-[13px] text-[var(--ds-text-muted)]">
                      Reason: {row.reason}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={status.tone}>{status.label}</Badge>
                  {row.status === 'NONE' || row.status === 'DENIED' || row.status === 'REVOKED' ? (
                    <button
                      type="button"
                      className={primaryButton}
                      disabled={!canAsk}
                      onClick={() => {
                        setError(undefined);
                        setTarget(row);
                      }}
                    >
                      {row.status === 'NONE' ? 'Request access' : 'Request again'}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={target !== null}
        title={`Request access at ${target?.institutionName ?? ''}`}
        onClose={() => setTarget(null)}
      >
        <div className="space-y-3">
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <label className="block text-[12px] font-semibold text-[var(--ds-text-secondary)]">
            Message (optional)
            <textarea
              className={textarea}
              rows={4}
              maxLength={1000}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Tell the placement team what roles you plan to hire for."
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={secondaryButton}
              onClick={() => setTarget(null)}
              disabled={send.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className={primaryButton}
              disabled={send.isPending || target === null}
              onClick={() => target && send.mutate(target)}
            >
              {send.isPending ? 'Sending…' : 'Send request'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
