'use client';

import {
  BarChart3,
  Calendar,
  CheckCircle2,
  FileText,
  Pencil,
  Trash2,
  Upload,
  MoreHorizontal,
  Clock,
  School,
} from 'lucide-react';
import type { CandidateEducationDto } from '@smart/contracts';
import { parseEducationDisplay } from '@/lib/education-entry-presenters';

interface EducationEntryCardProps {
  education: CandidateEducationDto;
  accentIndex?: number;
  onEdit: () => void;
  onDelete: () => void;
  onAddProof: () => void;
}

export function EducationEntryCard({
  education,
  onEdit,
  onDelete,
  onAddProof,
}: EducationEntryCardProps) {
  const display = parseEducationDisplay(education);
  const docCount = education.documents?.length ?? 0;
  const institutionLine = display.boardName
    ? `${display.schoolName} · ${display.boardName}`
    : display.schoolName;

  const isVerified = education.status === 'verified';
  const isRejected = education.status === 'rejected';
  const isPending = !isVerified && !isRejected;

  return (
    <article className="overflow-hidden rounded-md border border-zinc-200/80 bg-white shadow-2xs font-sans select-none dark:border-zinc-800 dark:bg-[#161616]">
      {/* Card Header */}
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-[#161616]">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 text-zinc-800 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            <School className="size-4.5" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading text-base font-bold tracking-tight text-zinc-950 dark:text-white">
                {display.programTitle}
              </h3>

              {isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CheckCircle2 className="size-3 text-emerald-600" />
                  Verified
                </span>
              )}

              {education.current && (
                <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  Current
                </span>
              )}

              {isRejected && (
                <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300">
                  Rejected
                </span>
              )}

              {isPending && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/90 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  <Clock className="size-3 text-amber-600" />
                  Pending review
                </span>
              )}
            </div>

            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {institutionLine}
              {education.degreeDetails?.rollNumber ? (
                <span className="text-zinc-400">
                  {' '}
                  · Roll {education.degreeDetails.rollNumber}
                  {education.degreeDetails.currentSemester
                    ? ` · Sem ${education.degreeDetails.currentSemester}`
                    : ''}
                </span>
              ) : null}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit education"
            className="flex size-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 shadow-2xs hover:bg-zinc-50 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete education"
            className="flex size-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 shadow-2xs hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Bento Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-zinc-50/50 dark:bg-zinc-900/30">
        {/* Tile 1: Duration */}
        <div className="flex flex-col justify-between rounded-md border border-zinc-200/80 bg-white p-3.5 shadow-2xs dark:border-zinc-800 dark:bg-[#161616]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Duration
          </span>
          <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-white">
            <Calendar className="size-3.5 text-zinc-400 shrink-0" />
            <span>{display.dateRangeLabel}</span>
          </div>
        </div>

        {/* Tile 2: Result */}
        <div className="flex flex-col justify-between rounded-md border border-zinc-200/80 bg-white p-3.5 shadow-2xs dark:border-zinc-800 dark:bg-[#161616]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Grading Scale
          </span>
          <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-white">
            <BarChart3 className="size-3.5 text-zinc-400 shrink-0" />
            <span className="truncate">{display.scoreSummary}</span>
          </div>
        </div>

        {/* Tile 3: Final Score */}
        <div className="flex flex-col justify-between rounded-md border border-zinc-200/80 bg-white p-3.5 shadow-2xs dark:border-zinc-800 dark:bg-[#161616]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Final Score
          </span>
          <div className="mt-1">
            <p className="font-heading text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
              {display.finalScore}
            </p>
          </div>
        </div>

        {/* Tile 4: Documents & Proof */}
        <div className="flex flex-col justify-between rounded-md border border-zinc-200/80 bg-white p-3.5 shadow-2xs dark:border-zinc-800 dark:bg-[#161616]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Verification Documents
          </span>
          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              <FileText className="size-3.5 text-zinc-400 shrink-0" />
              <span>{docCount === 0 ? 'No files attached' : `${docCount} document(s)`}</span>
            </div>

            <button
              type="button"
              onClick={onAddProof}
              className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
            >
              {docCount > 0 ? (
                <>
                  Manage
                  <MoreHorizontal className="size-3" />
                </>
              ) : (
                <>
                  Upload
                  <Upload className="size-3" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {education.status === 'rejected' && education.rejectionReason && (
        <p className="border-t border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {education.rejectionReason}
        </p>
      )}
    </article>
  );
}
