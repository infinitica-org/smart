'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  VerifiedBadge,
  getInitials,
} from '@smart/ui';
import type { CampusAccessRequestStatus, UniversityEmployerRequestRow } from '@smart/contracts';
import { api } from '../../lib/api';
import { ReasonConfirmDialog } from './ReasonConfirmDialog';

const TABS: { value: CampusAccessRequestStatus | 'ALL'; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'DENIED', label: 'Denied' },
  { value: 'REVOKED', label: 'Revoked' },
  { value: 'ALL', label: 'All' },
];

const STATUS_VARIANT = {
  PENDING: 'warning',
  APPROVED: 'success',
  DENIED: 'destructive',
  REVOKED: 'secondary',
} as const;

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/**
 * Th6-445 / Th6-446 — the campus-access review queue. Status tabs filter server-side; Approve is one click,
 * Deny asks for a reason first. The server owns the decision, so a repeated click is harmless.
 */
export function EmployerRequestsQueue() {
  const [tab, setTab] = useState<CampusAccessRequestStatus | 'ALL'>('PENDING');
  const [rows, setRows] = useState<UniversityEmployerRequestRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [denying, setDenying] = useState<UniversityEmployerRequestRow | null>(null);

  const load = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      setError(null);
      try {
        const page = await api.campus.listEmployerRequests({
          status: tab === 'ALL' ? undefined : tab,
          cursor,
        });
        setRows((current) => (cursor ? [...current, ...page.requests] : page.requests));
        setNextCursor(page.nextCursor);
      } catch (failure) {
        if (!cursor) setRows([]);
        setError(failure instanceof Error ? failure.message : 'Could not load requests.');
      } finally {
        setLoading(false);
      }
    },
    [tab],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(row: UniversityEmployerRequestRow) {
    setBusyId(row.id);
    setActionError(null);
    try {
      await api.campus.decideEmployerRequest(row.id, { decision: 'APPROVE' });
      setNotice(`${row.companyName} was approved. Their jobs are now visible to your students.`);
      await load();
    } catch (failure) {
      setActionError(
        failure instanceof Error ? failure.message : 'Could not approve this request.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deny(row: UniversityEmployerRequestRow, reason: string) {
    await api.campus.decideEmployerRequest(row.id, { decision: 'DENY', reason });
    setDenying(null);
    setNotice(`${row.companyName} was denied. They have been told why.`);
    await load();
  }

  return (
    <div className="space-y-4 pb-12">
      <div role="tablist" aria-label="Request status" className="flex flex-wrap gap-2">
        {TABS.map((entry) => (
          <button
            key={entry.value}
            type="button"
            role="tab"
            aria-selected={tab === entry.value}
            onClick={() => setTab(entry.value)}
            className={
              tab === entry.value
                ? 'rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white'
                : 'rounded-full border border-zinc-200 px-4 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50'
            }
          >
            {entry.label}
          </button>
        ))}
      </div>

      {notice ? (
        <Alert tone="success" role="status">
          {notice}
        </Alert>
      ) : null}
      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

      {error ? (
        <ErrorState title="Could not load requests" message={error} onRetry={() => void load()} />
      ) : loading && rows.length === 0 ? (
        <LoadingState message="Loading requests…" />
      ) : rows.length === 0 ? (
        <EmptyState
          title={tab === 'PENDING' ? 'No pending requests' : 'No requests here'}
          description={
            tab === 'PENDING'
              ? 'When an employer asks for campus access it will show up here.'
              : 'Nothing matches this filter yet.'
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Industry</th>
                <th className="px-4 py-3">Open jobs</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100 align-top last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-bold text-zinc-600"
                      >
                        {getInitials(row.companyName)}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-zinc-900">{row.companyName}</span>
                        <VerifiedBadge verified={row.verified} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{row.industry ?? '—'}</td>
                  <td className="px-4 py-3">{row.openJobCount}</td>
                  <td className="max-w-xs px-4 py-3 text-zinc-600">{row.message ?? '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {dateFormat.format(new Date(row.createdAt))}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[row.status]}>{row.status.toLowerCase()}</Badge>
                    {row.reason ? (
                      <div className="mt-1 text-xs text-zinc-500">{row.reason}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.status === 'PENDING' ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          disabled={busyId === row.id}
                          onClick={() => void approve(row)}
                        >
                          {busyId === row.id ? 'Approving…' : 'Approve'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === row.id}
                          onClick={() => setDenying(row)}
                        >
                          Deny
                        </Button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {nextCursor ? (
            <div className="border-t border-zinc-100 p-3 text-center">
              <Button variant="ghost" disabled={loading} onClick={() => void load(nextCursor)}>
                {loading ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          ) : null}
        </div>
      )}

      <ReasonConfirmDialog
        open={denying !== null}
        title={`Deny ${denying?.companyName ?? 'this employer'}?`}
        description="The employer is told your reason. They can ask again later."
        confirmText="Deny request"
        variant="warning"
        onClose={() => setDenying(null)}
        onSubmit={(reason) => (denying ? deny(denying, reason) : Promise.resolve())}
      />
    </div>
  );
}
