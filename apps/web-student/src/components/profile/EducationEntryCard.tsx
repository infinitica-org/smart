'use client';

import {
  BarChart3,
  Calendar,
  CheckCircle2,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
  Upload,
} from 'lucide-react';
import type { CandidateEducationDto } from '@smart/contracts';
import { EDUCATION_CARD_ACCENTS, parseEducationDisplay } from '@/lib/education-entry-presenters';

interface EducationEntryCardProps {
  education: CandidateEducationDto;
  accentIndex: number;
  onEdit: () => void;
  onDelete: () => void;
  onAddProof: () => void;
}

const metricTileBase =
  'flex min-h-[4.5rem] flex-col justify-center gap-0.5 rounded-[14px] px-3.5 py-3 ring-1';

export function EducationEntryCard({
  education,
  accentIndex,
  onEdit,
  onDelete,
  onAddProof,
}: EducationEntryCardProps) {
  const accent =
    EDUCATION_CARD_ACCENTS[accentIndex % EDUCATION_CARD_ACCENTS.length] ??
    EDUCATION_CARD_ACCENTS[0];
  const display = parseEducationDisplay(education);
  const docCount = education.documents?.length ?? 0;
  const institutionLine = display.boardName
    ? `${display.schoolName} · ${display.boardName}`
    : display.schoolName;

  return (
    <article
      className={`font-[family-name:var(--tpo-font-sans)] overflow-hidden rounded-[18px] border bg-[var(--ds-surface)] shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${accent.cardBorder}`}
    >
      <div
        className={`flex items-start justify-between gap-3 border-b border-[var(--ds-border-subtle)]/80 px-4 py-3.5 ${accent.headerWash}`}
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={`mt-1.5 size-2 shrink-0 rounded-full shadow-sm ${accent.marker}`}
            aria-hidden
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[17px] font-semibold leading-snug tracking-[-0.022em] text-[var(--ds-text)]">
                {display.programTitle}
              </h3>
              {education.status === 'verified' ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-[var(--ds-green-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--ds-green)]">
                  <CheckCircle2 className="size-3" aria-hidden />
                  Verified
                </span>
              ) : null}
              {education.current ? (
                <span className="rounded-md bg-white/70 px-2 py-0.5 text-[11px] font-medium text-[var(--ds-text-secondary)] ring-1 ring-[#101828]/[0.06]">
                  Current
                </span>
              ) : null}
              {education.status === 'rejected' ? (
                <span className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                  Rejected
                </span>
              ) : null}
              {education.status !== 'verified' && education.status !== 'rejected' ? (
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${accent.pendingBadge}`}
                >
                  Pending review
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-[13px] leading-snug tracking-[-0.01em] text-[var(--ds-text-muted)]">
              {institutionLine}
              {education.degreeDetails?.rollNumber ? (
                <span className="text-[var(--ds-text-subtle)]">
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

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit education"
            className="flex size-8 items-center justify-center rounded-lg bg-white/60 text-[var(--ds-text-muted)] ring-1 ring-[#101828]/[0.05] transition hover:bg-white hover:text-[var(--ds-text)]"
          >
            <Pencil className="size-4" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete education"
            className="flex size-8 items-center justify-center rounded-lg bg-white/60 text-[var(--ds-text-muted)] ring-1 ring-[#101828]/[0.05] transition hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="size-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 bg-[var(--ds-surface-muted)]/30 p-3 pt-2.5">
        <div className={`${metricTileBase} ${accent.durationTile}`}>
          <span className="text-[11px] font-medium tracking-[-0.01em] text-[var(--ds-text-subtle)]">
            Duration
          </span>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium tracking-[-0.01em] text-[var(--ds-text)]">
            <Calendar
              className={`size-3.5 shrink-0 ${accent.durationIcon}`}
              strokeWidth={1.5}
              aria-hidden
            />
            {display.dateRangeLabel}
          </span>
        </div>

        <div className={`${metricTileBase} ${accent.resultTile}`}>
          <span className="text-[11px] font-medium tracking-[-0.01em] text-[var(--ds-text-subtle)]">
            Result
          </span>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium tracking-[-0.01em] text-[var(--ds-text)]">
            <BarChart3
              className={`size-3.5 shrink-0 ${accent.resultIcon}`}
              strokeWidth={1.5}
              aria-hidden
            />
            <span className="line-clamp-1">{display.scoreSummary}</span>
          </span>
        </div>

        <div className={`${metricTileBase} col-span-1 ${accent.scoreTile}`}>
          <span className="text-[11px] font-medium tracking-[-0.01em] text-[var(--ds-text-subtle)]">
            Final score
          </span>
          <p
            className={`text-[26px] font-semibold leading-none tracking-[-0.03em] tabular-nums ${accent.scoreText}`}
          >
            {display.finalScore}
          </p>
        </div>

        <div className={`${metricTileBase} col-span-1 ${accent.docsTile}`}>
          <span className="text-[11px] font-medium tracking-[-0.01em] text-[var(--ds-text-subtle)]">
            Documents
          </span>
          <div className="flex items-center justify-between gap-1.5">
            <span
              className="inline-flex min-w-0 flex-1 items-center gap-1.5 text-[13px] font-medium text-[var(--ds-text-secondary)]"
              title={docCount === 0 ? 'No files attached' : `${docCount} file(s)`}
            >
              <FileText
                className={`size-3.5 shrink-0 ${accent.docsIcon}`}
                strokeWidth={1.5}
                aria-hidden
              />
              <span className="truncate">
                {docCount === 0 ? 'No files' : `${docCount} file${docCount === 1 ? '' : 's'}`}
              </span>
            </span>
            <button
              type="button"
              onClick={onAddProof}
              className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-white/70 px-2 py-1 text-[12px] font-semibold tracking-[-0.01em] text-[var(--ds-green)] ring-1 ring-[var(--ds-green)]/15 transition hover:bg-[var(--ds-green-soft)]"
            >
              {docCount > 0 ? (
                <>
                  Manage
                  <MoreHorizontal className="size-3.5" aria-hidden />
                </>
              ) : (
                <>
                  Upload
                  <Upload className="size-3.5" aria-hidden />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {education.status === 'rejected' && education.rejectionReason ? (
        <p className="border-t border-[var(--ds-border-subtle)] px-4 py-2.5 text-[12px] text-red-700">
          {education.rejectionReason}
        </p>
      ) : null}
    </article>
  );
}
