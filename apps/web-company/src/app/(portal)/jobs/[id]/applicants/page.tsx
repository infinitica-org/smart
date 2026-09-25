'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowLeft, Users } from 'lucide-react';
import {
  APPLICANT_SORT_KEYS,
  APPLICATION_STATUSES,
  EMPLOYER_APPLICATION_STATUS_LABELS,
  type ApplicantSortKey,
  type ApplicationStatus,
} from '@smart/contracts';
import { Alert, Button, EmptyState, ErrorState, LoadingState } from '@smart/ui';
import { api } from '@/lib/api';
import { useApplicantMoves } from '@/lib/use-applicant-moves';
import { CandidatePanel } from '@/components/pipeline/CandidatePanel';
import { PipelineBoard } from '@/components/pipeline/PipelineBoard';
import { StatusSelect } from '@/components/pipeline/StatusSelect';
import { PageHeader } from '../../../../../components/ui';
import {
  pageStack,
  table,
  tableCell,
  tableHeadCell,
  tableHeadRow,
  tableRow,
  tableShell,
} from '../../../../../lib/ui';

type View = 'list' | 'board';

const SORT_LABEL: Record<ApplicantSortKey, string> = {
  fit: 'Best fit first',
  applied: 'Newest first',
  status: 'By stage',
};
const BAND_LABEL = { STRONG: 'Strong fit', MODERATE: 'Good fit', STRETCH: 'Stretch' } as const;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** UTC, fixed month names: the same text in every locale and time zone. */
function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getUTCDate()).padStart(2, '0')} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Applicants for one job (Th6-390/391) with a list and a drag-and-drop pipeline board (Th6-414). */
export default function JobApplicantsPage() {
  const { id } = useParams<{ id: string }>();
  const [view, setView] = useState<View>('list');
  const [sort, setSort] = useState<ApplicantSortKey>('fit');
  const [status, setStatus] = useState<ApplicationStatus | ''>('');
  const [openId, setOpenId] = useState<string | null>(null);

  const queryKey = ['employer', 'applicants', id, sort, status] as const;
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      api.employer.listApplicants(id, {
        sort,
        status: status || undefined,
        cursor: pageParam,
        limit: 50,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    retry: false,
  });
  const moves = useApplicantMoves(queryKey);

  const applicants = query.data?.pages.flatMap((page) => page.applicants) ?? [];
  const roleTitle = query.data?.pages[0]?.job.roleTitle;
  const opened = applicants.find((a) => a.applicationId === openId);

  return (
    <div className={pageStack}>
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back to jobs
      </Link>
      <PageHeader
        title={roleTitle ? `Applicants: ${roleTitle}` : 'Applicants'}
        description="Review applicants and move them through your hiring stages."
      />

      <div className="flex flex-wrap items-end gap-3">
        <div role="tablist" aria-label="View" className="flex gap-2">
          {(['list', 'board'] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={view === option}
              onClick={() => setView(option)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${view === option ? 'bg-zinc-900 text-white' : 'bg-zinc-100'}`}
            >
              {option === 'list' ? 'List' : 'Pipeline board'}
            </button>
          ))}
        </div>
        <label className="text-xs font-semibold">
          Sort
          <select
            className="ml-2 h-9 rounded-lg border border-zinc-200 bg-white px-2 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value as ApplicantSortKey)}
          >
            {APPLICANT_SORT_KEYS.map((key) => (
              <option key={key} value={key}>
                {SORT_LABEL[key]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          Stage
          <select
            className="ml-2 h-9 rounded-lg border border-zinc-200 bg-white px-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as ApplicationStatus | '')}
          >
            <option value="">All stages</option>
            {APPLICATION_STATUSES.map((option) => (
              <option key={option} value={option}>
                {EMPLOYER_APPLICATION_STATUS_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {moves.notice ? (
        <Alert tone={moves.notice.kind === 'other' ? 'danger' : 'warning'} role="alert">
          <span className="flex flex-wrap items-center gap-3">
            {moves.notice.message}
            <button type="button" className="font-semibold underline" onClick={moves.dismissNotice}>
              Dismiss
            </button>
          </span>
        </Alert>
      ) : null}

      {query.isPending ? (
        <LoadingState message="Loading applicants…" />
      ) : query.isError ? (
        <ErrorState
          title="Could not load applicants"
          message="Check your connection and try again."
          onRetry={() => void query.refetch()}
        />
      ) : applicants.length === 0 ? (
        <EmptyState
          icon={Users}
          title={status ? 'No applicants at this stage' : 'No applicants yet'}
          description={
            status
              ? 'Try another stage to see more applicants.'
              : 'When students apply to this job, they appear here.'
          }
        />
      ) : view === 'board' ? (
        <PipelineBoard applicants={applicants} onMove={moves.move} />
      ) : (
        <div className={tableShell}>
          <table className={table}>
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Candidate</th>
                <th className={tableHeadCell}>Fit</th>
                <th className={tableHeadCell}>Status</th>
                <th className={tableHeadCell}>Applied</th>
              </tr>
            </thead>
            <tbody>
              {applicants.map((applicant) => (
                <tr key={applicant.applicationId} className={tableRow}>
                  <td className={tableCell}>
                    <button
                      type="button"
                      className="font-semibold text-blue-700 underline"
                      onClick={() => setOpenId(applicant.applicationId)}
                    >
                      {applicant.candidateName}
                    </button>
                  </td>
                  <td className={tableCell}>
                    {applicant.fit ? (
                      <span>
                        {BAND_LABEL[applicant.fit.band]} · {applicant.fit.matchPercent}%
                      </span>
                    ) : (
                      <span className="text-zinc-400">Not scored</span>
                    )}
                    {applicant.fitRecalculated ? (
                      <p className="text-xs text-amber-700" data-testid="recalculated-hint">
                        Fit changed since they applied
                      </p>
                    ) : null}
                  </td>
                  <td className={tableCell}>
                    <StatusSelect
                      applicant={applicant}
                      onChange={(to) => moves.move(applicant, to)}
                    />
                  </td>
                  <td className={tableCell}>{formatDate(applicant.appliedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {opened ? (
        <CandidatePanel
          key={opened.applicationId}
          applicant={opened}
          onClose={() => setOpenId(null)}
        />
      ) : null}

      {query.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? 'Loading…' : 'Load more applicants'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
