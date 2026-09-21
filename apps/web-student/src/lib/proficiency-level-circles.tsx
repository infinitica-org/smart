import { proficiencyLevelNumber } from '@smart/contracts';
import { cn } from '@smart/ui';

/** Student-facing verified depth (green through achieved level). */
export function ProficiencyLevelCircles({
  proficiency,
  maxLevel = 4,
  size = 'md',
}: {
  proficiency: string;
  maxLevel?: number;
  size?: 'sm' | 'md';
}) {
  const actualLevel = proficiencyLevelNumber(proficiency);
  const circleClass =
    size === 'sm'
      ? 'flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] text-[10px] font-semibold tabular-nums'
      : 'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold tabular-nums';
  const gapClass = size === 'sm' ? 'gap-1' : 'gap-1.5';

  return (
    <div
      className={cn('flex flex-wrap', gapClass)}
      aria-label={`Verified through level ${actualLevel}`}
    >
      {Array.from({ length: maxLevel }, (_, index) => index + 1).map((level) => {
        const met = actualLevel >= level;
        return (
          <span
            key={level}
            className={cn(
              circleClass,
              met
                ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                : 'border-border text-muted-foreground opacity-40',
            )}
          >
            {level}
          </span>
        );
      })}
    </div>
  );
}
