'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Briefcase, Bookmark } from 'lucide-react';
import type { StudentJobCard } from '@smart/contracts';
import { Alert, Button, EmptyState, ErrorState, LoadingState } from '@smart/ui';
import { api } from '@/lib/api';
import {
  activeFilters,
  clearFilters,
  parseJobsUrl,
  toJobsSearch,
  type JobsUrlState,
} from '@/lib/jobs-url-state';
import { FitTabs } from '@/components/jobs/FitTabs';
import { HideJobDialog } from '@/components/jobs/HideJobDialog';
import { JobCard } from '@/components/jobs/JobCard';
import { JobFilters } from '@/components/jobs/JobFilters';
import { ReportJobDialog } from '@/components/jobs/ReportJobDialog';
import { STUDENT_JOBS_KEY, savedJobsKey } from '@/components/jobs/job-cache';
import { useJobActions } from '@/components/jobs/use-job-actions';

interface Notice {
  text: string;
  undoJobId?: string;
}

const NOTICE_MS = 8000;

function JobsContent() {
  const router = useRouter();
  const state = parseJobsUrl(useSearchParams());
  const setState = (next: JobsUrlState) =>
    router.replace(`/jobs${toJobsSearch(next)}`, { scroll: false });

  const [notice, setNotice] = useState<Notice | null>(null);
  const [hideTarget, setHideTarget] = useState<StudentJobCard | null>(null);
  const [reportTarget, setReportTarget] = useState<StudentJobCard | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const actions = useJobActions((hidden) =>
    setNotice({ text: `“${hidden.title}” hidden.`, undoJobId: hidden.jobId }),
  );

  const browse = useInfiniteQuery({
    queryKey: [...STUDENT_JOBS_KEY, 'list', state.fit, state.type, state.mode, state.location],
    queryFn: ({ pageParam }) =>
      api.studentJobs.list({
        fit: state.fit,
        type: state.type,
        mode: state.mode,
        location: state.location,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: state.view === 'browse',
    retry: false,
  });
  const saved = useQuery({
    queryKey: savedJobsKey,
    queryFn: () => api.studentJobs.listSaved(),
    enabled: state.view === 'saved',
    retry: false,
  });

  const active = state.view === 'browse' ? browse : saved;
  const jobs: StudentJobCard[] =
    state.view === 'browse'
      ? (browse.data?.pages.flatMap((page) => page.jobs) ?? [])
      : (saved.data?.jobs ?? []);
  const counts = browse.data?.pages[0]?.counts;
  const filtered = activeFilters(state).length > 0;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 pb-12">
      <header>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Jobs</h1>
        <p className="text-sm text-zinc-500">
          Openings from your university and verified companies, ranked by how well you fit.
        </p>
      </header>

      <div role="tablist" aria-label="View" className="flex gap-2">
        {(['browse', 'saved'] as const).map((view) => (
          <button
            key={view}
            type="button"
            role="tab"
            aria-selected={state.view === view}
            onClick={() => setState({ ...state, view })}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              state.view === view ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'
            }`}
          >
            {view === 'browse' ? 'Browse' : 'Saved jobs'}
          </button>
        ))}
      </div>

      {state.view === 'browse' ? (
        <>
          <FitTabs
            value={state.fit}
            counts={counts}
            onChange={(fit) => setState({ ...state, fit })}
          />
          <JobFilters state={state} onChange={setState} />
        </>
      ) : null}

      {actions.error ? (
        <Alert tone="danger" role="alert">
          {actions.error}
        </Alert>
      ) : null}
      {notice ? (
        <Alert tone="info" role="status">
          <span className="flex flex-wrap items-center gap-3">
            {notice.text}
            {notice.undoJobId ? (
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => {
                  actions.undoHide(notice.undoJobId as string);
                  setNotice(null);
                }}
              >
                Undo
              </button>
            ) : null}
          </span>
        </Alert>
      ) : null}

      {active.isPending ? (
        <LoadingState
          message={state.view === 'saved' ? 'Loading saved jobs…' : 'Finding jobs for you…'}
        />
      ) : active.isError ? (
        <ErrorState
          title="Could not load jobs"
          message="Check your connection and try again."
          onRetry={() => void active.refetch()}
        />
      ) : jobs.length === 0 ? (
        state.view === 'saved' ? (
          <EmptyState
            icon={Bookmark}
            title="No saved jobs yet"
            description="Tap Save on a job to keep it here for later."
          />
        ) : (
          <EmptyState
            icon={Briefcase}
            title={filtered ? 'No jobs match these filters' : 'No jobs to show yet'}
            description={
              filtered
                ? 'Try removing a filter to see more openings.'
                : 'New openings from your university and verified companies will appear here.'
            }
            action={
              filtered ? (
                <Button variant="outline" onClick={() => setState(clearFilters(state))}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        )
      ) : (
        <>
          <ul className="space-y-3">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onToggleSave={(target, next) => actions.toggleSave(target, next)}
                onHide={setHideTarget}
                onReport={setReportTarget}
              />
            ))}
          </ul>
          {state.view === 'browse' && browse.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                disabled={browse.isFetchingNextPage}
                onClick={() => void browse.fetchNextPage()}
              >
                {browse.isFetchingNextPage ? 'Loading…' : 'Load more jobs'}
              </Button>
            </div>
          ) : null}
        </>
      )}

      <HideJobDialog
        open={hideTarget !== null}
        jobTitle={hideTarget?.roleTitle ?? ''}
        onClose={() => setHideTarget(null)}
        onConfirm={(reason) => {
          if (hideTarget) actions.hide(hideTarget, reason);
          setHideTarget(null);
        }}
      />
      {reportTarget ? (
        <ReportJobDialog
          open
          jobId={reportTarget.id}
          jobTitle={reportTarget.roleTitle}
          onClose={() => setReportTarget(null)}
          onReported={(_jobId, already) => {
            setReportTarget(null);
            setNotice({
              text: already
                ? 'You already reported this job. It stays hidden for you.'
                : 'Thanks. We hid this job for you and will review it.',
            });
          }}
        />
      ) : null}
    </div>
  );
}

export default function JobsPage() {
  // useSearchParams needs a Suspense boundary during static rendering.
  return (
    <Suspense fallback={<LoadingState message="Finding jobs for you…" />}>
      <JobsContent />
    </Suspense>
  );
}
