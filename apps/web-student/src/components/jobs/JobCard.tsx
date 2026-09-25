'use client';

import Link from 'next/link';
import { Bookmark, BookmarkCheck, EyeOff, Flag, MapPin } from 'lucide-react';
import type { JobFitBand, StudentJobCard } from '@smart/contracts';
import { AppliedBadge, VerifiedBadge } from '@smart/ui';
import { EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS } from '@/lib/jobs-url-state';

const BAND_LABEL: Record<JobFitBand, string> = {
  STRONG: 'Strong fit',
  MODERATE: 'Good fit',
  STRETCH: 'Stretch',
};
const BAND_STYLE: Record<JobFitBand, string> = {
  STRONG: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  MODERATE: 'border-amber-200 bg-amber-50 text-amber-800',
  STRETCH: 'border-zinc-200 bg-zinc-50 text-zinc-700',
};

interface JobCardProps {
  job: StudentJobCard;
  onToggleSave: (job: StudentJobCard, saved: boolean) => void;
  onHide: (job: StudentJobCard) => void;
  onReport: (job: StudentJobCard) => void;
}

/** One job in the list: what it is, who posted it, how well it fits, and quick actions. */
export function JobCard({ job, onToggleSave, onHide, onReport }: JobCardProps) {
  const meta = [
    job.employmentType ? (EMPLOYMENT_TYPE_LABELS[job.employmentType] ?? job.employmentType) : null,
    job.workMode ? WORK_MODE_LABELS[job.workMode] : null,
  ].filter(Boolean);

  return (
    <li className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-[#161616]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/jobs/${job.id}`}
              className="font-heading text-base font-bold text-zinc-950 hover:underline dark:text-white"
            >
              {job.roleTitle}
            </Link>
            <AppliedBadge applied={job.applied} />
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            {job.companyName}
            <VerifiedBadge
              verified={job.companyVerified}
              verifiedAt={job.companyVerifiedAt}
              variant="icon"
            />
          </p>
        </div>
        {job.fit ? (
          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${BAND_STYLE[job.fit.band]}`}
            data-testid="fit-band"
          >
            {BAND_LABEL[job.fit.band]} · {job.fit.matchPercent}%
          </span>
        ) : null}
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
        {job.location ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden />
            {job.location}
          </span>
        ) : null}
        {meta.length > 0 ? <span>{meta.join(' · ')}</span> : null}
        {job.lastDateToApply ? <span>Apply by {job.lastDateToApply}</span> : null}
      </p>

      {job.fit?.topReason ? (
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{job.fit.topReason}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={job.saved}
          aria-label={job.saved ? `Unsave ${job.roleTitle}` : `Save ${job.roleTitle}`}
          onClick={() => onToggleSave(job, !job.saved)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold hover:bg-zinc-50 dark:border-zinc-700"
        >
          {job.saved ? (
            <BookmarkCheck className="size-4 text-emerald-600" aria-hidden />
          ) : (
            <Bookmark className="size-4" aria-hidden />
          )}
          {job.saved ? 'Saved' : 'Save'}
        </button>
        <button
          type="button"
          aria-label={`Hide ${job.roleTitle}`}
          onClick={() => onHide(job)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold hover:bg-zinc-50 dark:border-zinc-700"
        >
          <EyeOff className="size-4" aria-hidden /> Hide
        </button>
        <button
          type="button"
          aria-label={`Report ${job.roleTitle}`}
          onClick={() => onReport(job)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-500 hover:text-red-600"
        >
          <Flag className="size-4" aria-hidden /> Report
        </button>
      </div>
    </li>
  );
}
