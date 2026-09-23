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

export type BadgeVariant =
  'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'teal';

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
  default: 'border-transparent bg-[var(--ds-primary,var(--brand-500))] text-white hover:opacity-90',
  secondary: 'border-transparent bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)]',
  destructive: 'border-transparent bg-red-600 text-white hover:bg-red-700',
  outline: 'text-[var(--ds-text)] border-[var(--ds-border-subtle)] bg-transparent',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300',
  warning:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300',
  info: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300',
  teal: 'border-[#CCFBF1] bg-[#F0FDFA] text-[#004C63]',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export function Badge({
  variant = 'default',
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        BADGE_VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'size-1.5 rounded-full shrink-0',
            variant === 'success' && 'bg-emerald-500',
            variant === 'warning' && 'bg-amber-500',
            variant === 'destructive' && 'bg-red-500',
            variant === 'info' && 'bg-sky-500',
            variant === 'teal' && 'bg-[#004C63]',
            (variant === 'default' || variant === 'secondary' || variant === 'outline') &&
              'bg-current',
          )}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}

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
