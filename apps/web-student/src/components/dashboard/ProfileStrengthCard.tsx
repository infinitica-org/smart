'use client';

import { profileStrengthFromPercent } from '@/lib/profile-progress';

interface ProfileStrengthCardProps {
  percent: number | null;
  loading?: boolean;
}

export function ProfileStrengthCard({ percent, loading = false }: ProfileStrengthCardProps) {
  const safePercent = percent ?? 0;
  const strength = profileStrengthFromPercent(safePercent);

  return (
    <section
      aria-label="Profile strength"
      className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Profile strength
      </p>
      {loading ? (
        <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-4xl font-semibold tabular-nums tracking-tight text-foreground">
              {safePercent}%
            </span>
            <span className="text-sm font-medium text-emerald-700">{strength.label}</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {strength.description}
          </p>
        </>
      )}
    </section>
  );
}
