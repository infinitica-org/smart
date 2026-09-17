import { JOB_POSTING_STEPS, type JobPostingStepId } from '../../lib/job-posting';
import { mutedTextClass } from '../../lib/tpo-ui';

export function JobPostingStepper({
  currentStep,
  onSelect,
}: {
  currentStep: JobPostingStepId;
  onSelect: (step: JobPostingStepId) => void;
}) {
  const currentIndex = JOB_POSTING_STEPS.findIndex((step) => step.id === currentStep);

  return (
    <div className="rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)] px-5 py-4 shadow-[var(--ds-card-shadow)]">
      <p className={`text-xs font-semibold ${mutedTextClass}`}>
        Step {currentIndex + 1} of {JOB_POSTING_STEPS.length}
      </p>
      <ol className="mt-3 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {JOB_POSTING_STEPS.map((step, index) => {
          const active = step.id === currentStep;
          const complete = index < currentIndex;

          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center">
              <button
                type="button"
                onClick={() => onSelect(step.id)}
                aria-label={`Go to step ${index + 1}: ${step.label}`}
                aria-current={active ? 'step' : undefined}
                className="flex min-w-0 flex-1 flex-col items-center gap-2 rounded-lg px-1 py-1 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-text)]"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${
                    active
                      ? 'bg-[var(--tpo-accent)] text-[var(--ds-text)]'
                      : complete
                        ? 'bg-[var(--ds-green-soft)] text-[var(--ds-green)]'
                        : 'bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)]'
                  }`}
                >
                  {index + 1}
                </span>
                <span
                  className={`w-full truncate text-[11px] font-semibold ${
                    active ? 'text-[var(--ds-text)]' : 'text-[var(--ds-text-muted)]'
                  }`}
                >
                  {step.shortLabel}
                </span>
              </button>
              {index < JOB_POSTING_STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={`mb-6 hidden h-px flex-1 sm:block ${
                    complete ? 'bg-[var(--tpo-accent)]' : 'bg-[var(--ds-border)]'
                  }`}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
