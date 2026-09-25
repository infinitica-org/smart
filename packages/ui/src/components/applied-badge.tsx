import { CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/cn';

export interface AppliedBadgeProps {
  /** True when the student already has an application for this job. False renders nothing. */
  applied: boolean;
  className?: string;
}

/** Marks a job the student already applied to (job cards and job detail). */
export function AppliedBadge({ applied, className }: AppliedBadgeProps) {
  if (!applied) return null;
  return (
    <span
      data-testid="applied-badge"
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300',
        className,
      )}
    >
      <CheckCircle2 className="size-3.5" aria-hidden />
      Applied
    </span>
  );
}
