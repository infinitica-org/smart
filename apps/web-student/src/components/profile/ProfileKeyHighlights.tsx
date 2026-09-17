'use client';

import type { ProfileHighlightsData } from '@/lib/profile-highlights';
import {
  profileHeadingClass,
  profileMutedTextClass,
  profileSecondaryTextClass,
} from '@/lib/profile-ui-classes';

interface ProfileKeyHighlightsProps {
  highlights: ProfileHighlightsData;
}

function HighlightCard({
  label,
  primary,
  secondary,
  empty,
}: {
  label: string;
  primary: string;
  secondary: string;
  empty: boolean;
}) {
  return (
    <div className="flex h-full min-h-[7.5rem] flex-col rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-[18px] shadow-[var(--ds-card-shadow)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ds-text-subtle)]">
        {label}
      </p>
      {empty ? (
        <p className={`mt-auto pt-3 text-sm font-medium ${profileMutedTextClass}`}>Not added yet</p>
      ) : (
        <div className="mt-auto flex flex-1 flex-col justify-end pt-3">
          <p className={`text-sm font-semibold leading-snug ${profileHeadingClass}`}>{primary}</p>
          {secondary ? (
            <p className={`mt-1 text-xs leading-snug ${profileSecondaryTextClass}`}>{secondary}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function ProfileKeyHighlights({ highlights }: ProfileKeyHighlightsProps) {
  return (
    <section aria-labelledby="key-highlights-heading" className="space-y-4">
      <div>
        <h2
          id="key-highlights-heading"
          className={`text-base font-semibold ${profileHeadingClass}`}
        >
          Key Highlights
        </h2>
        <p className={`mt-1 text-sm ${profileSecondaryTextClass}`}>
          Quick facts about you at a glance.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-stretch">
        <HighlightCard
          label="Experience"
          primary={highlights.experience?.primary ?? ''}
          secondary={highlights.experience?.secondary ?? ''}
          empty={!highlights.experience}
        />
        <HighlightCard
          label="Education"
          primary={highlights.education?.primary ?? ''}
          secondary={highlights.education?.secondary ?? ''}
          empty={!highlights.education}
        />
        <HighlightCard
          label="Location"
          primary={highlights.location?.primary ?? ''}
          secondary={highlights.location?.secondary ?? ''}
          empty={!highlights.location}
        />
        <HighlightCard
          label="Role Preference"
          primary={highlights.rolePreference?.primary ?? ''}
          secondary={highlights.rolePreference?.secondary ?? ''}
          empty={!highlights.rolePreference}
        />
      </div>
    </section>
  );
}
