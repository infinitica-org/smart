'use client';

import { useEffect, useState, type ElementType } from 'react';
import {
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
  type AdminReportRow,
  type ListAdminReportsQuery,
} from '@smart/contracts';
import { Flag } from 'lucide-react';
import { useQuery, useSmartApi } from '../api-provider';
import { Button } from '../components/button';
import { EmptyState, ErrorState, LoadingState } from '../components/common-states';
import { messageErrorText } from './messaging-utils';

const TARGET_LABEL = { MESSAGE: 'Message', JOB: 'Job' } as const;
const REASON_LABEL = {
  SCAM: 'Scam',
  DISCRIMINATORY: 'Discriminatory',
  MISLEADING: 'Misleading',
  OTHER: 'Other',
} as const;
const STATUS_LABEL = {
  OPEN: 'Open',
  REVIEWING: 'Reviewing',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
} as const;

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const controlClass =
  'h-9 rounded-md border border-neutral-300 bg-white px-2 text-xs font-medium dark:border-neutral-700 dark:bg-neutral-900';

type TargetFilter = (typeof REPORT_TARGET_TYPES)[number] | '';
type StatusFilter = (typeof REPORT_STATUSES)[number] | '';

export interface AdminReportsListProps {
  /** Where a row's detail page lives; the report id is appended. */
  detailHref?: string;
  /** e.g. `next/link`, so opening a report is a client-side navigation. */
  linkComponent?: ElementType;
}

/**
 * Th6-430 — the moderation queue: newest first, filterable by target, status and date, with cursor
 * paging. It shows metadata only; the reported content and the audited reason dialog stay on the
 * detail page each row links to.
 */
export function AdminReportsList({
  detailHref = '/admin/reports',
  linkComponent: LinkComponent = 'a',
}: AdminReportsListProps) {
  const api = useSmartApi();
  // Messages are what moderators open first.
  const [targetType, setTargetType] = useState<TargetFilter>('MESSAGE');
  const [status, setStatus] = useState<StatusFilter>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [more, setMore] = useState<{ rows: AdminReportRow[]; cursor: string | null } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);

  const filters: Partial<ListAdminReportsQuery> = {
    ...(targetType ? { targetType } : {}),
    ...(status ? { status } : {}),
    ...(from ? { from: `${from}T00:00:00.000Z` } : {}),
    ...(to ? { to: `${to}T23:59:59.999Z` } : {}),
    limit: 20,
  };
  const filterKey = JSON.stringify(filters);

  const first = useQuery({
    queryKey: ['messaging', 'admin-reports', filterKey],
    queryFn: () => api.messaging.adminListReports(filters),
    retry: false,
  });

  // A different filter starts a new list, so pages from the old one are dropped.
  useEffect(() => {
    setMore(null);
    setMoreError(null);
  }, [filterKey]);

  const rows = [...(first.data?.reports ?? []), ...(more?.rows ?? [])];
  const nextCursor = more ? more.cursor : (first.data?.nextCursor ?? null);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const page = await api.messaging.adminListReports({ ...filters, cursor: nextCursor });
      setMore((current) => ({
        rows: [...(current?.rows ?? []), ...page.reports],
        cursor: page.nextCursor,
      }));
    } catch (error) {
      setMoreError(messageErrorText(error));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="space-y-4">
      <div
        role="search"
        aria-label="Filter reports"
        className="flex flex-wrap items-end gap-3 rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
      >
        <label className="grid gap-1 text-xs font-semibold">
          Target
          <select
            className={controlClass}
            value={targetType}
            onChange={(event) => setTargetType(event.target.value as TargetFilter)}
          >
            <option value="">All targets</option>
            {REPORT_TARGET_TYPES.map((type) => (
              <option key={type} value={type}>
                {TARGET_LABEL[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold">
          Status
          <select
            className={controlClass}
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
          >
            <option value="">Any status</option>
            {REPORT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABEL[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold">
          From
          <input
            type="date"
            className={controlClass}
            value={from}
            max={to || undefined}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold">
          To
          <input
            type="date"
            className={controlClass}
            value={to}
            min={from || undefined}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
      </div>

      {first.isLoading ? (
        <LoadingState message="Loading reports…" />
      ) : first.error ? (
        <ErrorState
          title="Could not load reports"
          message={messageErrorText(first.error)}
          onRetry={() => void first.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="No reports found"
          description="Nothing matches these filters. Try a wider date range or another status."
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/60">
                <th className="px-4 py-3">Reported</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">{dateTime.format(new Date(row.createdAt))}</td>
                  <td className="px-4 py-3">{TARGET_LABEL[row.targetType]}</td>
                  <td className="px-4 py-3">{REASON_LABEL[row.reason]}</td>
                  <td className="px-4 py-3">{STATUS_LABEL[row.status]}</td>
                  <td className="px-4 py-3 text-right">
                    <LinkComponent
                      href={`${detailHref}/${row.id}`}
                      className="font-semibold underline"
                      aria-label={`Review ${TARGET_LABEL[row.targetType].toLowerCase()} report from ${dateTime.format(new Date(row.createdAt))}`}
                    >
                      Review
                    </LinkComponent>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nextCursor && !first.isLoading && !first.error ? (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" disabled={loadingMore} onClick={() => void loadMore()}>
            {loadingMore ? 'Loading…' : 'Load more reports'}
          </Button>
          {moreError ? (
            <span role="alert" className="text-xs text-red-600">
              {moreError}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
