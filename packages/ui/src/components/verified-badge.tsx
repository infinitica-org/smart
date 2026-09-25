import { ShieldCheck } from 'lucide-react';
import { cn } from '../lib/cn';

export interface VerifiedBadgeProps {
  /** The server's verification flag. Nothing is inferred on the client; false renders nothing. */
  verified: boolean;
  /** ISO timestamp of the server-recorded approval, used only for the tooltip. */
  verifiedAt?: string | null;
  /** `icon` shows the mark alone (job cards, message headers). */
  variant?: 'pill' | 'icon';
  className?: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function verifiedTooltip(verifiedAt?: string | null): string {
  const date = verifiedAt ? new Date(verifiedAt) : null;
  if (!date || Number.isNaN(date.getTime())) return 'SMART verified this company';
  const formatted = `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  return `SMART verified this company on ${formatted}`;
}

/** Verified-company indicator (Th6-354). Driven only by the server's verification status. */
export function VerifiedBadge({
  verified,
  verifiedAt,
  variant = 'pill',
  className,
}: VerifiedBadgeProps) {
  if (!verified) return null;
  const tooltip = verifiedTooltip(verifiedAt);
  return (
    <span
      className={cn('group relative inline-flex items-center', className)}
      data-testid="verified-badge"
      tabIndex={0}
      aria-label={tooltip}
    >
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
          variant === 'icon' ? 'p-1' : 'px-2.5 py-0.5',
        )}
      >
        <ShieldCheck className="size-3.5" aria-hidden />
        {variant === 'pill' ? 'Verified' : <span className="sr-only">Verified</span>}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 hidden w-max max-w-[16rem] -translate-x-1/2 rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block group-focus:block"
      >
        {tooltip}
      </span>
    </span>
  );
}
