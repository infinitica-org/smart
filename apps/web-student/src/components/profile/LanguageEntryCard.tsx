'use client';

import { Gauge, Pencil, Trash2 } from 'lucide-react';
import type { CandidateLanguageDto } from '@smart/contracts';

import {
  LANGUAGE_CARD_ACCENTS,
  proficiencySummary,
  proficiencyTier,
} from '@/lib/language-entry-presenters';

interface LanguageEntryCardProps {
  entry: CandidateLanguageDto;
  accentIndex: number;
  onEdit: () => void;
  onDelete: () => void;
}

const metricTileBase =
  'flex min-h-[4.5rem] flex-col justify-center gap-0.5 rounded-[14px] px-3.5 py-3 ring-1';

export function LanguageEntryCard({
  entry,
  accentIndex,
  onEdit,
  onDelete,
}: LanguageEntryCardProps) {
  const accent =
    LANGUAGE_CARD_ACCENTS[accentIndex % LANGUAGE_CARD_ACCENTS.length] ?? LANGUAGE_CARD_ACCENTS[0];
  const tier = proficiencyTier(entry.proficiency);
  const tierPercent = Math.round((tier / 5) * 100);

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
            <h3 className="text-[17px] font-semibold leading-snug tracking-[-0.022em] text-[var(--ds-text)]">
              {entry.language}
            </h3>
            <p className="mt-0.5 text-[13px] leading-snug tracking-[-0.01em] text-[var(--ds-text-muted)]">
              {proficiencySummary(entry.proficiency)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${entry.language}`}
            className="flex size-8 items-center justify-center rounded-lg bg-white/60 text-[var(--ds-text-muted)] ring-1 ring-[#101828]/[0.05] transition hover:bg-white hover:text-[var(--ds-text)]"
          >
            <Pencil className="size-4" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${entry.language}`}
            className="flex size-8 items-center justify-center rounded-lg bg-white/60 text-[var(--ds-text-muted)] ring-1 ring-[#101828]/[0.05] transition hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="size-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="bg-[var(--ds-surface-muted)]/30 p-3 pt-2.5">
        <div className={`${metricTileBase} ${accent.levelTile}`}>
          <span className="text-[11px] font-medium tracking-[-0.01em] text-[var(--ds-text-subtle)]">
            Proficiency
          </span>
          <span
            className={`inline-flex items-center gap-1.5 text-[13px] font-medium tracking-[-0.01em] ${accent.levelText}`}
          >
            <Gauge
              className={`size-3.5 shrink-0 ${accent.levelIcon}`}
              strokeWidth={1.5}
              aria-hidden
            />
            {entry.proficiency}
          </span>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/70 ring-1 ring-[#101828]/[0.05]"
            role="presentation"
          >
            <div
              className={`h-full rounded-full ${accent.marker}`}
              style={{ width: `${tierPercent}%` }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
