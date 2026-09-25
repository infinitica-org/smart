import { cn } from '@smart/ui';
import {
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
  type StudentApplicationDetail,
} from '@smart/contracts';

/** The forward path a student sees. Not selected / Withdrawn are endings, not steps. */
export const STATUS_STEPS = ['APPLIED', 'REVIEWING', 'INTERVIEWING', 'OFFERED', 'HIRED'] as const;

const ENDED: readonly ApplicationStatus[] = ['REJECTED', 'WITHDRAWN'];

export function statusStepReached(current: ApplicationStatus, step: ApplicationStatus): boolean {
  if (ENDED.includes(current)) return false;
  return (
    STATUS_STEPS.indexOf(step as (typeof STATUS_STEPS)[number]) <=
    STATUS_STEPS.indexOf(current as (typeof STATUS_STEPS)[number])
  );
}

/** Progress bar in student-facing wording only (Submitted, Under review, ...). */
export function ApplicationStatusBar({
  status,
  labels = true,
}: {
  status: ApplicationStatus;
  labels?: boolean;
}) {
  const ended = ENDED.includes(status);
  return (
    <div>
      <div className="flex gap-1.5" data-testid="status-bar" data-status={status}>
        {STATUS_STEPS.map((step) => {
          const reached = statusStepReached(status, step);
          const current = !ended && step === status;
          return (
            <div key={step} className="min-w-0 flex-1">
              <div
                data-reached={reached ? 'true' : 'false'}
                className={cn(
                  'h-2 rounded-full',
                  reached ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-800',
                  current && 'bg-emerald-600 ring-2 ring-emerald-500/40 dark:bg-emerald-400',
                )}
              />
              {labels ? (
                <p
                  className={cn(
                    'mt-1.5 hidden truncate text-[10px] font-medium sm:block',
                    current ? 'font-bold text-zinc-900 dark:text-white' : 'text-zinc-500',
                  )}
                >
                  {APPLICATION_STATUS_LABELS[step]}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      {ended ? (
        <p className="mt-2 text-xs font-semibold text-zinc-900 dark:text-white">
          {APPLICATION_STATUS_LABELS[status]}
        </p>
      ) : null}
    </div>
  );
}

/** What actually happened to this application, with dates (student-facing labels). */
export function ApplicationTimeline({
  entries,
}: {
  entries: StudentApplicationDetail['timeline'];
}) {
  return (
    <ol className="space-y-2" aria-label="Application history">
      {entries.map((entry) => (
        <li
          key={`${entry.status}-${entry.at}`}
          className="flex items-baseline justify-between gap-3 text-sm"
        >
          <span className="font-semibold">{entry.statusLabel}</span>
          <time className="text-xs text-zinc-500" dateTime={entry.at}>
            {new Date(entry.at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </time>
        </li>
      ))}
    </ol>
  );
}
