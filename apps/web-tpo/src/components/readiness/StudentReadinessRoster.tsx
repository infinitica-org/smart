'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, EmptyState, ErrorState, LoadingState } from '@smart/ui';
import {
  UniversityVerificationStatusSchema,
  type UniversityRosterRow,
  type UniversityVerificationStatus,
} from '@smart/contracts';
import { universityApi } from '../../lib/api';
import { MessageStudentModal } from './MessageStudentModal';

const STATUS_LABEL: Record<UniversityVerificationStatus, string> = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  VERIFIED: 'Verified',
};
const STATUS_VARIANT = {
  NOT_STARTED: 'secondary',
  IN_PROGRESS: 'warning',
  VERIFIED: 'success',
} as const;

export function VerificationBadge({ status }: { status: UniversityVerificationStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}

/**
 * Th6-437/438/439 — the student roster. Filters live in the URL (`?verificationStatus=&program=&gradYear=`)
 * so a filtered view can be shared and survives a reload. Rows are paged with a server cursor.
 */
export function StudentReadinessRoster() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const statusParam = params.get('verificationStatus');
  const status = UniversityVerificationStatusSchema.safeParse(statusParam).success
    ? (statusParam as UniversityVerificationStatus)
    : '';
  const program = params.get('program') ?? '';
  const gradYear = params.get('gradYear') ?? '';
  const search = params.get('search') ?? '';

  const [rows, setRows] = useState<UniversityRosterRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messaging, setMessaging] = useState<UniversityRosterRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const setFilter = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.replace(next.size > 0 ? `${pathname}?${next.toString()}` : pathname);
    },
    [params, pathname, router],
  );

  const load = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      setError(null);
      try {
        const page = await universityApi.roster({
          verificationStatus: status || undefined,
          program: program || undefined,
          gradYear: gradYear ? Number(gradYear) : undefined,
          search: search || undefined,
          cursor,
        });
        setRows((current) => (cursor ? [...current, ...page.items] : page.items));
        setNextCursor(page.nextCursor);
      } catch (err) {
        if (!cursor) setRows([]);
        setError(err instanceof Error ? err.message : 'Could not load students.');
      } finally {
        setLoading(false);
      }
    },
    [status, program, gradYear, search],
  );

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  const hasFilters = Boolean(status || program || gradYear || search);

  return (
    <div className="space-y-4 pb-12">
      <div className="flex flex-wrap items-end gap-3" role="search">
        <label className="text-xs font-semibold">
          Search by name
          <input
            type="search"
            defaultValue={search}
            onChange={(event) => setFilter('search', event.target.value.trim())}
            className="mt-1 block w-52 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-semibold">
          Verification status
          <select
            value={status}
            onChange={(event) => setFilter('verificationStatus', event.target.value)}
            className="mt-1 block rounded-lg border border-zinc-200 px-3 py-2 text-sm font-normal"
          >
            <option value="">All</option>
            {UniversityVerificationStatusSchema.options.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABEL[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          Program
          <input
            defaultValue={program}
            onChange={(event) => setFilter('program', event.target.value.trim())}
            placeholder="e.g. B.Tech CSE"
            className="mt-1 block w-44 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-semibold">
          Graduation year
          <input
            inputMode="numeric"
            defaultValue={gradYear}
            onChange={(event) => setFilter('gradYear', event.target.value.replace(/\D/g, ''))}
            placeholder="e.g. 2026"
            className="mt-1 block w-28 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-normal"
          />
        </label>
        {hasFilters ? (
          <Button variant="ghost" onClick={() => router.replace(pathname)}>
            Clear all
          </Button>
        ) : null}
      </div>

      {hasFilters ? (
        <ul aria-label="Active filters" className="flex flex-wrap gap-2">
          {status ? (
            <li>
              <Badge variant="outline">Status: {STATUS_LABEL[status]}</Badge>
            </li>
          ) : null}
          {program ? (
            <li>
              <Badge variant="outline">Program: {program}</Badge>
            </li>
          ) : null}
          {gradYear ? (
            <li>
              <Badge variant="outline">Graduating {gradYear}</Badge>
            </li>
          ) : null}
          {search ? (
            <li>
              <Badge variant="outline">Name: {search}</Badge>
            </li>
          ) : null}
        </ul>
      ) : null}

      {notice ? (
        <Alert tone="success" role="status">
          {notice}
        </Alert>
      ) : null}

      {error ? (
        <ErrorState title="Could not load students" message={error} onRetry={() => void load()} />
      ) : loading && rows.length === 0 ? (
        <LoadingState message="Loading students…" />
      ) : rows.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'No students match these filters' : 'No students yet'}
          description={
            hasFilters
              ? 'Try removing a filter to see more students.'
              : 'Students appear here once they are added to your institution.'
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Program</th>
                <th className="px-4 py-3">Graduating</th>
                <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3">Skills</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.userId} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/students/readiness/${row.userId}`}
                      className="font-semibold text-zinc-900 hover:underline"
                    >
                      {row.fullName}
                    </Link>
                    <div className="text-xs text-zinc-500">{row.email}</div>
                  </td>
                  <td className="px-4 py-3">{row.program ?? '—'}</td>
                  <td className="px-4 py-3">{row.graduationYear ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <VerificationBadge status={row.verificationStatus} />
                      {row.needsAssistance ? (
                        <Badge variant="warning">Needs assistance</Badge>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-600">
                    {row.verifiedSkillCount} verified · {row.declaredSkillCount} declared
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => setMessaging(row)}>
                      {row.needsAssistance ? 'Offer help' : 'Message'}
                    </Button>
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

      {messaging ? (
        <MessageStudentModal
          open
          studentId={messaging.userId}
          studentName={messaging.fullName}
          onClose={() => setMessaging(null)}
          onSent={() => setNotice(`Message sent to ${messaging.fullName}.`)}
        />
      ) : null}
    </div>
  );
}
