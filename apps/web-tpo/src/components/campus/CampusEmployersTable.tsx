'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, EmptyState, ErrorState, LoadingState, getInitials } from '@smart/ui';
import type { CampusEmployerStatus, UniversityEmployerRow } from '@smart/contracts';
import { api } from '../../lib/api';
import { ReasonConfirmDialog } from './ReasonConfirmDialog';

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/**
 * Th6-447 — employers approved (or revoked) at this campus with aggregate counts only. No student is
 * named here. Revoking asks for a reason and hides the employer's jobs from students; applications stay.
 */
export function CampusEmployersTable() {
  const [status, setStatus] = useState<CampusEmployerStatus | ''>('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<UniversityEmployerRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<UniversityEmployerRow | null>(null);

  const load = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      setError(null);
      try {
        const page = await api.campus.listEmployers({
          status: status || undefined,
          search: search.trim() || undefined,
          cursor,
        });
        setRows((current) => (cursor ? [...current, ...page.employers] : page.employers));
        setNextCursor(page.nextCursor);
      } catch (failure) {
        if (!cursor) setRows([]);
        setError(failure instanceof Error ? failure.message : 'Could not load employers.');
      } finally {
        setLoading(false);
      }
    },
    [status, search],
  );

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  async function revoke(row: UniversityEmployerRow, reason: string) {
    await api.campus.revokeEmployer(row.companyId, { reason });
    setRevoking(null);
    setNotice(
      `${row.companyName} was revoked. Their jobs are hidden from your students; applications are kept.`,
    );
    await load();
  }

  const hasFilters = Boolean(status || search.trim());

  return (
    <div className="space-y-4 pb-12">
      <div className="flex flex-wrap items-end gap-3" role="search">
        <label className="text-xs font-semibold">
          Search by company
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="mt-1 block w-56 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-semibold">
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as CampusEmployerStatus | '')}
            className="mt-1 block rounded-lg border border-zinc-200 px-3 py-2 text-sm font-normal"
          >
            <option value="">All</option>
            <option value="ACTIVE">Approved</option>
            <option value="REVOKED">Revoked</option>
          </select>
        </label>
        {hasFilters ? (
          <Button
            variant="ghost"
            onClick={() => {
              setStatus('');
              setSearch('');
            }}
          >
            Clear all
          </Button>
        ) : null}
      </div>

      {notice ? (
        <Alert tone="success" role="status">
          {notice}
        </Alert>
      ) : null}

      {error ? (
        <ErrorState title="Could not load employers" message={error} onRetry={() => void load()} />
      ) : loading && rows.length === 0 ? (
        <LoadingState message="Loading employers…" />
      ) : rows.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'No employers match these filters' : 'No employers yet'}
          description={
            hasFilters
              ? 'Try removing a filter to see more employers.'
              : 'Employers appear here once you approve their campus access request.'
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Open jobs</th>
                <th className="px-4 py-3">Applicants from here</th>
                <th className="px-4 py-3">Hires from here</th>
                <th className="px-4 py-3">Last activity</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.companyId} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-bold text-zinc-600"
                      >
                        {getInitials(row.companyName)}
                      </span>
                      <div>
                        <div className="font-semibold text-zinc-900">{row.companyName}</div>
                        <div className="text-xs text-zinc-500">{row.industry ?? '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {row.status === 'ACTIVE' ? (
                      <Badge variant="success">Approved</Badge>
                    ) : (
                      <Badge variant="secondary">Revoked</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">{row.openJobCount}</td>
                  <td className="px-4 py-3">{row.applicantCount}</td>
                  <td className="px-4 py-3">{row.hireCount}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {row.lastActivityAt ? dateFormat.format(new Date(row.lastActivityAt)) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.status === 'ACTIVE' ? (
                      <Button size="sm" variant="outline" onClick={() => setRevoking(row)}>
                        Revoke
                      </Button>
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
        open={revoking !== null}
        title={`Revoke ${revoking?.companyName ?? 'this employer'}?`}
        description="Their jobs disappear for your students right away. Applications already made are kept."
        confirmText="Revoke access"
        onClose={() => setRevoking(null)}
        onSubmit={(reason) => (revoking ? revoke(revoking, reason) : Promise.resolve())}
      />
    </div>
  );
}
