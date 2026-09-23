'use client';

import { ProficiencyLevelHint } from '@smart/ui';
import { SKILL_PROFICIENCIES } from '@smart/contracts';

export { ProficiencyLevelHint };

function levelCircleClass(size: 'md' | 'sm'): string {
  return size === 'sm'
    ? 'flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] text-[10px] font-semibold tabular-nums'
    : 'flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold tabular-nums';
}

export function ProficiencyLevelCircles({
  actualLevel,
  requiredLevel,
  maxLevel = SKILL_PROFICIENCIES.length,
  mode = 'requirement',
  size = 'md',
}: {
  actualLevel: number;
  requiredLevel: number;
  maxLevel?: number;
  /** requirement: green through required bar; verified-only: green through actual only */
  mode?: 'requirement' | 'verified-only';
  size?: 'md' | 'sm';
}) {
  const cappedRequired =
    mode === 'verified-only'
      ? Math.min(Math.max(actualLevel, 0), maxLevel)
      : Math.min(Math.max(requiredLevel, 1), maxLevel);
  const circleClass = levelCircleClass(size);
  const gapClass = size === 'sm' ? 'gap-1' : 'gap-2';

  return (
    <div
      className={`flex flex-wrap ${gapClass}`}
      aria-label={
        mode === 'verified-only'
          ? `Verified through level ${actualLevel}`
          : `Demonstrated level ${actualLevel}, required level ${cappedRequired}`
      }
    >
      {Array.from({ length: maxLevel }, (_, index) => index + 1).map((level) => {
        const met = actualLevel >= level;
        if (mode === 'verified-only') {
          return (
            <span
              key={level}
              className={[
                circleClass,
                met
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-[var(--ds-border-subtle)] text-[var(--ds-text-muted)] opacity-40',
              ].join(' ')}
            >
              {level}
            </span>
          );
        }

        const inRequirement = level <= cappedRequired;
        return (
          <span
            key={level}
            className={[
              circleClass,
              inRequirement && met
                ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                : inRequirement
                  ? 'border-dashed border-rose-300 bg-rose-50/40 text-rose-700'
                  : 'border-[var(--ds-border-subtle)] text-[var(--ds-text-muted)] opacity-50',
            ].join(' ')}
          >
            {level}
          </span>
        );
      })}
    </div>
  );
}

export function ProficiencyLevelLegend() {
  return (
    <div className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-4 py-3 text-[12px] leading-relaxed text-[var(--ds-text-secondary)]">
      <p className="font-semibold text-[var(--ds-text)]">
        How to read level circles <ProficiencyLevelHint className="ml-0.5" />
      </p>
      <ul className="mt-2 list-inside list-disc space-y-1">
        <li>
          <span className="font-medium text-emerald-800">Solid green</span> — candidate has verified
          that level (through the required bar when the opening sets a minimum).
        </li>
        <li>
          <span className="font-medium text-rose-700">Dashed outline</span> — still required by the
          opening; not yet verified at that level.
        </li>
        <li>Numbers are Level 1–5 (hover the ℹ icon for Beginner → Professional mapping).</li>
      </ul>
    </div>
  );
}
