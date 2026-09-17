'use client';

import Link from 'next/link';

import { PROFILE_AREA_HREFS, PROFILE_AREA_IDS, type ProfileAreaId } from '@/lib/profile-progress';
import {
  profileCardClass,
  profileHeadingClass,
  profileMutedTextClass,
  profileSecondaryTextClass,
} from '@/lib/profile-ui-classes';

interface ProfileCompletionCardProps {
  percent: number | null;
  completedCount: number | null;
  areaStatus?: Partial<Record<ProfileAreaId, boolean>>;
  loading?: boolean;
  showViewMissing?: boolean;
}

function firstIncompleteAreaHref(
  areaStatus: Partial<Record<ProfileAreaId, boolean>> | undefined,
): string {
  const incomplete = PROFILE_AREA_IDS.find((id) => !areaStatus?.[id]);
  return incomplete ? PROFILE_AREA_HREFS[incomplete] : '/profile?section=experience';
}

export function ProfileCompletionCard({
  percent,
  completedCount,
  areaStatus,
  loading = false,
  showViewMissing = true,
}: ProfileCompletionCardProps) {
  const safePercent = percent ?? 0;
  const total = PROFILE_AREA_IDS.length;
  const completed = completedCount ?? 0;
  const filledSegments = Math.round((safePercent / 100) * total);

  return (
    <div
      className={`${profileCardClass} bg-[var(--ds-green-muted)]`}
      aria-label="Profile completion"
    >
      {loading ? (
        <p className={`text-sm ${profileSecondaryTextClass}`}>Loading progress…</p>
      ) : (
        <>
          <p className="text-[2rem] font-semibold leading-none tracking-tight text-[var(--ds-green)]">
            {safePercent}%
          </p>
          <p className={`mt-0.5 text-sm font-medium ${profileHeadingClass}`}>Profile Completion</p>

          <div
            className="mt-3 flex gap-1"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={safePercent}
            aria-label="Profile completion segments"
          >
            {Array.from({ length: total }, (_, index) => (
              <span
                key={index}
                className={`h-1.5 flex-1 rounded-full ${
                  index < filledSegments ? 'bg-[var(--ds-green)]' : 'bg-[var(--ds-progress-track)]'
                }`}
              />
            ))}
          </div>

          <p className={`mt-2.5 text-sm ${profileSecondaryTextClass}`}>
            {completed} of {total} sections complete
          </p>

          <p className={`mt-2.5 text-sm leading-snug ${profileMutedTextClass}`}>
            A complete profile gets you matched to the right roles. An incomplete one gets you
            skipped.
          </p>

          {showViewMissing && completed < total ? (
            <Link
              href={firstIncompleteAreaHref(areaStatus)}
              className="mt-2.5 inline-flex text-sm font-medium text-[var(--ds-green)] hover:text-[var(--ds-green-hover)]"
            >
              View missing sections →
            </Link>
          ) : null}
        </>
      )}
    </div>
  );
}
