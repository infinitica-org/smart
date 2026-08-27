import type { Tier } from '@smart/contracts';
import { TierBadge } from './badge';
import { cn } from '../lib/cn';

export interface TierTrailProps {
  tiers: { level: number; tier: Tier }[];
  className?: string;
}

export function TierTrail({ tiers, className }: TierTrailProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {tiers.map((t, i) => (
        <div key={t.level} className="flex items-center gap-2">
          {i > 0 && <span className="text-[var(--text-muted)] text-sm font-medium">→</span>}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-semibold tracking-wider text-[var(--text-muted)] uppercase">
              L{t.level}
            </span>
            <TierBadge tier={t.tier} />
          </div>
        </div>
      ))}
    </div>
  );
}
