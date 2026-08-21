import { LEVEL_DEFINITIONS } from '@smart/contracts';
import { cn } from '../lib/cn.js';

export type LevelState = 'locked' | 'active' | 'cleared';

export interface LevelStepperProps {
  /** Highest level the candidate may currently open (1–5). */
  unlockedThrough: 1 | 2 | 3 | 4 | 5;
  current?: 1 | 2 | 3 | 4 | 5;
}

/**
 * L1–L5 progression. A locked level is not clickable — SMART does not let a
 * candidate skip to the capstone.
 */
export function LevelStepper({ unlockedThrough, current }: LevelStepperProps) {
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Assessment levels">
      {LEVEL_DEFINITIONS.map((level) => {
        const state: LevelState =
          level.level === current ? 'active' : level.level <= unlockedThrough ? 'cleared' : 'locked';
        return (
          <li
            key={level.level}
            className={cn(
              'flex min-w-28 flex-col rounded-lg border px-3 py-2 text-sm',
              state === 'active' && 'border-level-active bg-brand-50',
              state === 'cleared' && 'border-level-cleared/40',
              state === 'locked' && 'border-[var(--surface-border)] opacity-60',
            )}
            aria-current={state === 'active' ? 'step' : undefined}
          >
            <span className="font-semibold">{level.code}</span>
            <span className="text-xs text-[var(--text-muted)]">{level.name}</span>
          </li>
        );
      })}
    </ol>
  );
}
