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
      <div className="flex flex-1 gap-1" data-testid="ats-timeline" data-stage={stage}>
        {ATS_PIPELINE_STAGES.map((column) => {
          const reached = stageReached(stage, column);
          const current = !terminal && column === stage;
          return (
            <div key={column} className="min-w-0 flex-1">
              <div
                className={cn(
                  'h-1.5 rounded-full',
                  terminal ? 'bg-white/10' : reached ? 'bg-[#00FAD0]' : 'bg-white/10',
                  current && 'shadow-[0_0_10px_rgba(0,250,208,0.45)]',
                )}
                data-reached={reached ? 'true' : 'false'}
              />
              {labels ? (
                <p
                  className={cn(
                    'mt-1.5 hidden truncate text-[10px] sm:block',
                    current ? 'text-[#00FAD0]' : 'text-white/30',
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
        <p className="mt-2 text-xs font-semibold text-[#00FAD0]">{ATS_STAGE_LABELS[stage]}</p>
      ) : null}
    </div>
  );
}
