import { Info } from 'lucide-react';
import type { SkillLevel } from '../lib/types';

/**
 * Skill level chip with a "Why this level?" popover. Shows on hover and keyboard
 * focus so the explanation is never hover-only.
 */
export function LevelBadge({
  skill,
  level,
  evidence,
}: {
  skill: string;
  level: SkillLevel;
  evidence?: string[];
}) {
  const bullets = evidence && evidence.length > 0 ? evidence : ['No evidence recorded yet'];
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={`Why is ${skill} rated ${level}?`}
        className="inline-flex items-center gap-1 rounded-md border border-[#ddd6fb] bg-[#f5f3ff] px-2 py-0.5 text-[11px] font-semibold text-[#5b48d6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5b48d6]"
      >
        {skill} · {level}
        <Info className="size-3" aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute left-0 top-full z-30 mt-2 w-64 rounded-[14px] border border-[var(--ds-border)] bg-white p-3 text-left opacity-0 shadow-lg transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        <span className="block text-[12px] font-semibold text-[var(--ds-text)]">{skill}</span>
        <span className="mt-1 inline-flex rounded-md border border-[#ddd6fb] bg-[#f5f3ff] px-2 py-0.5 text-[11px] font-semibold text-[#5b48d6]">
          {level}
        </span>
        <span className="mt-2 block text-[11px] font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]">
          Why this level?
        </span>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-[12px] text-[var(--ds-text-secondary)]">
          {bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </span>
    </span>
  );
}
