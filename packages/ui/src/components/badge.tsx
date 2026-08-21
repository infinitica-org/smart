import type { HTMLAttributes } from 'react';
import type { Tier } from '@smart/contracts';
import { TIER_LABEL } from '@smart/contracts';
import { cn } from '../lib/cn';

/**
 * Certification-tier badge. Colours come from the shared theme tokens so a Gold
 * on the student portal is the same Gold an employer sees on verify.smart.
 *
 * Owner: Satheswaran V.
 */

const TIER_CLASS: Record<Tier, string> = {
  GOLD: 'bg-tier-gold text-tier-gold-fg',
  SILVER: 'bg-tier-silver text-tier-silver-fg',
  BRONZE: 'bg-tier-bronze text-tier-bronze-fg',
  BELOW_BRONZE: 'bg-tier-below text-tier-below-fg',
};

export interface TierBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tier: Tier;
  /** Show the employer-facing label ("Ready Now") under the metal name. */
  showLabel?: boolean;
}

export function TierBadge({ tier, showLabel = false, className, ...props }: TierBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide',
        TIER_CLASS[tier],
        className,
      )}
      {...props}
    >
      {tier === 'BELOW_BRONZE' ? 'Not certified' : titleCase(tier)}
      {showLabel ? <span className="font-normal opacity-80">· {TIER_LABEL[tier]}</span> : null}
    </span>
  );
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' ');
}
