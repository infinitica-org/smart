'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Bookmark, BookmarkCheck, EyeOff, Flag, MapPin } from 'lucide-react';
import { isSmartApiError } from '@smart/api-client';
import { Alert, AppliedBadge, Button, ErrorState, LoadingState, VerifiedBadge } from '@smart/ui';
import { api } from '@/lib/api';
import { EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS } from '@/lib/jobs-url-state';
import { ApplyJobDialog } from '@/components/applications/ApplyJobDialog';
import { HideJobDialog } from '@/components/jobs/HideJobDialog';
import { JobRequirements } from '@/components/jobs/JobRequirements';
import { ReportJobDialog } from '@/components/jobs/ReportJobDialog';
import { jobDetailKey } from '@/components/jobs/job-cache';
import { useJobActions } from '@/components/jobs/use-job-actions';

const VERIFY_BASE_URL = process.env.NEXT_PUBLIC_VERIFY_URL ?? 'http://localhost:3004';

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  // A job card's Apply button opens this page with ?apply=1 so the dialog is already open.
  const [applyOpen, setApplyOpen] = useState(useSearchParams().get('apply') === '1');
  const [hideOpen, setHideOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const actions = useJobActions(() => router.push('/jobs'));

  const query = useQuery({
    queryKey: jobDetailKey(id),
    queryFn: () => api.studentJobs.detail(id),
    retry: false,
  });

  if (query.isPending) {
    return <LoadingState message="Loading job…" />;
  }
  if (query.isError) {
    const missing = isSmartApiError(query.error) && query.error.statusCode === 404;
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700"
        >
          <ArrowLeft className="size-4" aria-hidden /> Back to jobs
        </Link>
        {missing ? (
          <Alert tone="info" title="This job is not available">
            It may have been removed, or it is not open to you.
          </Alert>
        ) : (
          <ErrorState
            title="Could not load this job"
            message="Check your connection and try again."
            onRetry={() => void query.refetch()}
          />
        )}
      </div>
    );
  }

  const job = query.data;
  const meta = [
    job.employmentType ? (EMPLOYMENT_TYPE_LABELS[job.employmentType] ?? job.employmentType) : null,
    job.workMode ? WORK_MODE_LABELS[job.workMode] : null,
  ].filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-12">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back to jobs
      </Link>

      {actions.error ? (
        <Alert tone="danger" role="alert">
          {actions.error}
        </Alert>
      ) : null}
      {!job.acceptingApplications ? (
        <Alert tone="warning" title="No longer accepting applications">
          This job is closed. You can still see it because you applied to it or saved it.
        </Alert>
      ) : null}

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-2xl font-bold tracking-tight">{job.roleTitle}</h1>
          <AppliedBadge applied={job.applied} />
        </div>
        <p className="text-sm text-zinc-600">
          {job.companyName}
          {job.location ? (
            <span className="ml-3 inline-flex items-center gap-1 text-zinc-500">
              <MapPin className="size-3.5" aria-hidden />
              {job.location}
            </span>
          ) : null}
        </p>
        {meta.length > 0 ? <p className="text-xs text-zinc-500">{meta.join(' · ')}</p> : null}
        {job.fit ? (
          <p className="text-sm font-semibold" data-testid="detail-fit">
            {job.fit.band === 'STRONG'
              ? 'Strong fit'
              : job.fit.band === 'MODERATE'
                ? 'Good fit'
                : 'Stretch'}{' '}
            · {job.fit.matchPercent}% match
          </p>
        ) : null}
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {job.applied ? (
          <Link
            href="/applications"
            className="inline-flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white"
          >
            View application
          </Link>
        ) : (
          <Button
            disabled={!job.acceptingApplications}
            title={
              job.acceptingApplications ? undefined : 'This job is no longer accepting applications'
            }
            onClick={() => setApplyOpen(true)}
          >
            Apply
          </Button>
        )}
        <Button
          variant="outline"
          aria-pressed={job.saved}
          onClick={() => actions.toggleSave(job, !job.saved)}
        >
          {job.saved ? (
            <BookmarkCheck className="mr-1.5 size-4 text-emerald-600" aria-hidden />
          ) : (
            <Bookmark className="mr-1.5 size-4" aria-hidden />
          )}
          {job.saved ? 'Saved' : 'Save'}
        </Button>
        <Button variant="outline" onClick={() => setHideOpen(true)}>
          <EyeOff className="mr-1.5 size-4" aria-hidden /> Hide
        </Button>
        <Button variant="ghost" onClick={() => setReportOpen(true)}>
          <Flag className="mr-1.5 size-4" aria-hidden /> Report
        </Button>
      </div>

      <section
        aria-label="Company"
        className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <div className="flex flex-wrap items-center gap-2">
          {job.logoUrl ? (
            // Signed storage URL; not routed through next/image.
            <img src={job.logoUrl} alt="" className="size-10 rounded-lg border object-cover" />
          ) : null}
          <h2 className="text-base font-bold">{job.companyName}</h2>
          <VerifiedBadge verified={job.companyVerified} verifiedAt={job.companyVerifiedAt} />
        </div>
        {job.aboutCompany ? <p className="mt-2 text-sm">{job.aboutCompany}</p> : null}
        {job.companyVerified && job.companyId ? (
          <a
            href={`${VERIFY_BASE_URL}/companies/${job.companyId}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm font-semibold text-blue-700 hover:underline"
          >
            View company page
          </a>
        ) : null}
      </section>

      {job.whyItMatches.length > 0 ? (
        <section aria-label="Why it matches">
          <h2 className="text-base font-bold">Why it matches</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {job.whyItMatches.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {job.description ? (
        <section aria-label="About the role">
          <h2 className="text-base font-bold">About the role</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{job.description}</p>
        </section>
      ) : null}

      <section aria-label="Requirements">
        <h2 className="text-base font-bold">Required skills and evidence</h2>
        <div className="mt-2">
          <JobRequirements requirements={job.requirements} />
        </div>
      </section>

      {applyOpen ? (
        <ApplyJobDialog open jobId={job.id} onClose={() => setApplyOpen(false)} />
      ) : null}
      <HideJobDialog
        open={hideOpen}
        jobTitle={job.roleTitle}
        onClose={() => setHideOpen(false)}
        onConfirm={(reason) => {
          setHideOpen(false);
          actions.hide(job, reason);
        }}
      />
      {reportOpen ? (
        <ReportJobDialog
          open
          jobId={job.id}
          jobTitle={job.roleTitle}
          onClose={() => setReportOpen(false)}
          onReported={() => router.push('/jobs')}
        />
      ) : null}
    </div>
  );
}
