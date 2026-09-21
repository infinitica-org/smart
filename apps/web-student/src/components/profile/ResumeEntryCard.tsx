'use client';

import { CheckCircle2, FileText, Sparkles, Trash2 } from 'lucide-react';
import type { CandidateResumeFile } from '@smart/contracts';

import { CERTIFICATE_CARD_ACCENTS } from '@/lib/certificate-entry-presenters';
import { formatResumeSize } from '@/lib/resume-list';

interface ResumeEntryCardProps {
  file: CandidateResumeFile;
  accentIndex: number;
  isPrimary: boolean;
  deleting: boolean;
  onDelete: () => void;
}

export function ResumeEntryCard({
  file,
  accentIndex,
  isPrimary,
  deleting,
  onDelete,
}: ResumeEntryCardProps) {
  const accent =
    CERTIFICATE_CARD_ACCENTS[accentIndex % CERTIFICATE_CARD_ACCENTS.length] ??
    CERTIFICATE_CARD_ACCENTS[0];
  const uploadedLabel = new Date(file.uploadedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

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
              <h3 className="truncate text-[17px] font-semibold leading-snug tracking-[-0.022em] text-[var(--ds-text)]">
                {file.fileName}
              </h3>
              {isPrimary ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-[var(--ds-green-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--ds-green)]">
                  <Sparkles className="size-3" aria-hidden />
                  Latest
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-[13px] text-[var(--ds-text-muted)]">
              Uploaded {uploadedLabel}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          aria-label={`Remove ${file.fileName}`}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/60 text-[var(--ds-text-muted)] ring-1 ring-[#101828]/[0.05] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          <Trash2 className="size-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 bg-[var(--ds-surface-muted)]/30 p-3 pt-2.5">
        <div
          className={`flex min-h-[4rem] flex-col justify-center gap-0.5 rounded-[14px] px-3.5 py-3 ring-1 ${accent.proofTile}`}
        >
          <span className="text-[11px] font-medium text-[var(--ds-text-subtle)]">Size</span>
          <span className="text-[13px] font-medium text-[var(--ds-text)]">
            {formatResumeSize(file.fileSizeBytes)}
          </span>
        </div>
        <div
          className={`flex min-h-[4rem] flex-col justify-center gap-0.5 rounded-[14px] px-3.5 py-3 ring-1 ${accent.issuedTile}`}
        >
          <span className="text-[11px] font-medium text-[var(--ds-text-subtle)]">Format</span>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--ds-text-secondary)]">
            <FileText className={`size-3.5 ${accent.proofIcon}`} aria-hidden />
            <span className="truncate">
              {file.mimeType.replace(/^application\//, '').toUpperCase()}
            </span>
          </span>
        </div>
      </div>

      {file.lastParsedAt ? (
        <p className="flex items-center gap-1.5 border-t border-[var(--ds-border-subtle)]/80 px-4 py-2.5 text-[12px] text-[var(--ds-green)]">
          <CheckCircle2 className="size-3.5" aria-hidden />
          Parsed for profile pre-fill
        </p>
      ) : null}
    </article>
  );
}
