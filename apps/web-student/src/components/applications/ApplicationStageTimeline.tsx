import { cn } from '@smart/ui';
import type { AtsStage } from '@smart/contracts';
import {
  ATS_PIPELINE_STAGES,
  ATS_STAGE_LABELS,
  isTerminalAtsStage,
  stageReached,
} from '../../lib/my-applications';

export function ApplicationStageTimeline({
  stage,
  labels = true,
}: {
  stage: AtsStage;
  labels?: boolean;
}) {
  const terminal = isTerminalAtsStage(stage);

  return (
    <div>
      <div className="flex flex-1 gap-1.5" data-testid="ats-timeline" data-stage={stage}>
        {ATS_PIPELINE_STAGES.map((column) => {
          const reached = stageReached(stage, column);
          const current = !terminal && column === stage;
          return (
            <div key={column} className="min-w-0 flex-1">
              <div
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  terminal
                    ? 'bg-zinc-200 dark:bg-zinc-800'
                    : reached
                      ? 'bg-zinc-900 dark:bg-white'
                      : 'bg-zinc-200 dark:bg-zinc-800',
                  current && 'ring-2 ring-emerald-500/40 bg-emerald-600 dark:bg-emerald-400',
                )}
                data-reached={reached ? 'true' : 'false'}
              />
              {labels ? (
                <p
                  className={cn(
                    'mt-1.5 hidden truncate text-[10px] sm:block font-medium',
                    current
                      ? 'font-bold text-zinc-900 dark:text-white'
                      : reached
                        ? 'text-zinc-600 dark:text-zinc-300'
                        : 'text-zinc-400 dark:text-zinc-500',
                  )}
                >
                  {ATS_STAGE_LABELS[column]}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      {terminal ? (
        <p className="mt-2 text-xs font-semibold text-zinc-900 dark:text-white">
          {ATS_STAGE_LABELS[stage]}
        </p>
      ) : null}
    </div>
  );
}
