'use client';

import Link from 'next/link';

import { ArrowRight } from 'lucide-react';

import { PROFILE_AREA_IDS, type ProfileAreaId } from '@/lib/profile-progress';

const SECTION_COUNT = PROFILE_AREA_IDS.length;

interface ProfileCompletionHeroCardProps {
  percent: number | null;

  areaStatus: Record<ProfileAreaId, boolean> | null;

  loading?: boolean;
}

export function ProfileCompletionHeroCard({
  percent,

  areaStatus,

  loading = false,
}: ProfileCompletionHeroCardProps) {
  const completedCount = areaStatus ? PROFILE_AREA_IDS.filter((id) => areaStatus[id]).length : null;

  const displayPercent =
    completedCount !== null ? Math.round((completedCount / SECTION_COUNT) * 100) : (percent ?? 0);

  const complete = displayPercent >= 100;

  const percentColor = complete ? 'text-[var(--ds-success)]' : 'text-[var(--ds-coral)]';

  const borderClass = complete ? 'border-[var(--ds-border)]' : 'border-[var(--ds-coral-border)]';

  return (
    <aside
      aria-label="Profile completion"

      className={`rounded-[14px] border bg-[var(--ds-surface)] px-6 py-5 shadow-[var(--ds-card-shadow)] ${borderClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={`text-[2.25rem] font-semibold tabular-nums leading-none ${percentColor}`}>
          {loading ? '—' : `${displayPercent}%`}
        </p>

        {!loading ? (
          <Link
            href="/profile"

            aria-label="Go to Profile"

            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--ds-border)] text-[var(--ds-icon)] transition hover:border-[var(--ds-border-inner)] hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-link)]"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      <h2 className="mt-2 text-lg font-semibold text-[var(--ds-text)]">Profile Completion</h2>

      {!loading && completedCount !== null ? (
        <p className="mt-1 text-xs tabular-nums text-[var(--ds-text-subtle)]">
          {completedCount} of {SECTION_COUNT} sections complete
        </p>
      ) : null}

      <div
        className="mt-4 overflow-hidden rounded-full bg-[var(--ds-progress-track)] p-px"

        role="progressbar"

        aria-valuemin={0}

        aria-valuemax={100}

        aria-valuenow={displayPercent}

        aria-label={`Profile completion: ${completedCount ?? 0} of ${SECTION_COUNT} sections`}
      >
        <div className="grid grid-cols-8 gap-px">
          {PROFILE_AREA_IDS.map((areaId, index) => {
            const filled =
              completedCount !== null ? index < completedCount : (areaStatus?.[areaId] ?? false);

            return (
              <div
                key={areaId}

                className={`h-2 min-w-0 ${filled ? 'bg-[var(--ds-success)]' : 'bg-transparent'}`}
              />
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-[var(--ds-text-muted)]">
        A complete profile gets you matched to the right roles. An incomplete one gets you skipped.
      </p>
    </aside>
  );
}
