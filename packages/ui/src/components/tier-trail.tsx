import { type Tier } from '@smart/contracts';
import { cn } from '../lib/cn';
import { TierBadge } from './badge';

export type TierProgress = {
  level: number;
  tier: Tier;
};

export interface TierTrailProps {
  tiers: TierProgress[];
  className?: string;
}

export function TierTrail({ tiers, className }: TierTrailProps) {
  if (!tiers || tiers.length === 0) {
    return (
      <div className={cn('text-sm text-[var(--text-muted)] italic', className)}>
        No tiers awarded yet. Complete levels to earn tiers.
      </div>
    );
  }

  return (
    <ol className={cn('flex items-center flex-wrap gap-2', className)} aria-label="Tier history">
      {tiers.map((t, i) => (
        <li key={t.level} className="flex items-center gap-2">
          {i > 0 && (
            <span className="text-[var(--text-muted)] text-xl leading-none" aria-hidden="true">
              →
            </span>
          )}
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-medium text-[var(--text-muted)]">L{t.level}</span>
            <TierBadge tier={t.tier} showLabel />
          </div>
        </li>
      ))}
    </ol>
  );
}
