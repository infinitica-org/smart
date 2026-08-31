import type { HTMLAttributes } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../lib/cn';

export interface PipelineStage {
  id: string;
  label: string;
  status: 'complete' | 'active' | 'upcoming' | 'failed';
}

export interface PipelineStageBarProps extends HTMLAttributes<HTMLDivElement> {
  stages: PipelineStage[];
  interactive?: boolean;
  onStageSelect?: (stageId: string) => void;
}

export function PipelineStageBar({
  stages,
  interactive = false,
  onStageSelect,
  className,
  ...props
}: PipelineStageBarProps) {
  if (!stages || stages.length === 0) return null;

  return (
    <div
      className={cn('w-full py-4', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={stages.length}
      aria-valuenow={stages.filter((s) => s.status === 'complete' || s.status === 'active').length}
      aria-valuetext={`Pipeline stage: ${stages.find((s) => s.status === 'active')?.label || 'Unstarted'}`}
      {...props}
    >
      <ol className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-2">
        {stages.map((stage, index) => {
          const isComplete = stage.status === 'complete';
          const isActive = stage.status === 'active';
          const isFailed = stage.status === 'failed';
          const isUpcoming = stage.status === 'upcoming';

          const elementTheme = cn(
            isComplete && 'border-success text-success bg-success/10',
            isActive &&
              'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-deep)]/20 shadow-[0_0_8px_rgba(0,250,208,0.25)]',
            isFailed && 'border-danger text-danger bg-danger/10',
            isUpcoming && 'border-[var(--surface-border)] text-[var(--text-muted)] bg-transparent',
          );

          const labelTheme = cn(
            isComplete && 'text-success font-medium',
            isActive && 'text-[var(--accent)] font-bold',
            isFailed && 'text-danger font-medium',
            isUpcoming && 'text-[var(--text-muted)] font-normal',
          );

          const StepWrapper = interactive ? 'button' : 'div';
          const wrapperProps = interactive
            ? {
                type: 'button' as const,
                onClick: () => onStageSelect?.(stage.id),
                className: cn(
                  'group flex flex-1 flex-row items-center gap-3 rounded-md p-2 text-left transition-all hover:bg-[var(--surface-muted)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2',
                  isActive && 'bg-[var(--surface-muted)]',
                ),
                'aria-current': isActive ? ('step' as const) : undefined,
              }
            : {
                className: 'flex flex-1 flex-row items-center gap-3 p-1',
              };

          return (
            <li key={stage.id} className="flex flex-1 flex-row items-center sm:relative">
              <StepWrapper {...wrapperProps}>
                {/* Step circle */}
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all',
                    elementTheme,
                  )}
                >
                  {isComplete ? (
                    <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                  ) : isFailed ? (
                    <X className="h-4 w-4 shrink-0" aria-hidden="true" />
                  ) : isActive ? (
                    <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-ping" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </span>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <span className={cn('block text-xs uppercase tracking-wider', labelTheme)}>
                    {stage.label}
                  </span>
                </div>
              </StepWrapper>

              {/* Progress Connector (horizontal on desktop) */}
              {index < stages.length - 1 && (
                <div
                  className={cn(
                    'hidden h-[1px] flex-1 bg-[var(--surface-border)] sm:block sm:mx-2',
                    isComplete && 'bg-success/50',
                    isActive && 'bg-[var(--accent)]/30',
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
