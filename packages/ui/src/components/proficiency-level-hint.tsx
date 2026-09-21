'use client';

import { Info } from 'lucide-react';
import { proficiencyLegendEntries } from '@smart/contracts';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const legend = proficiencyLegendEntries();

export function ProficiencyLevelHint({ className = '' }: { className?: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="What do verified level numbers mean?"
            className={`inline-flex rounded-full p-0.5 align-middle text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${className}`}
          >
            <Info className="size-3.5 opacity-80" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6} className="max-w-[240px] p-3 text-left">
          <p className="mb-2 text-xs font-semibold text-background">Verified proficiency levels</p>
          <ul className="space-y-1 text-xs leading-snug text-background/90">
            {legend.map((row) => (
              <li key={row.level}>
                <span className="font-semibold tabular-nums">Level {row.level}</span>
                <span className="text-background/75"> — {row.traditionalLabel}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] leading-snug text-background/75">
            Green circles show the highest level you have verified for this skill.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
