'use client';

import {
  buildSkillBlueprintForCategory,
  getSkillDefinition,
  type AssessmentResult,
} from '@smart/contracts';

function competencyLabel(skillCode: string, competencyId: string): string {
  const def = getSkillDefinition(skillCode);
  if (!def) return competencyId.slice(0, 8);
  const blueprint = buildSkillBlueprintForCategory(
    def.code,
    def.name,
    def.domain,
    def.categoryName,
    def.categoryId,
  );
  return (
    blueprint.competencyModel.find((entry) => entry.competencyId === competencyId)?.capability ??
    competencyId.slice(0, 8)
  );
}

function statusTone(status: string): string {
  if (status === 'DEMONSTRATED') return 'text-emerald-400';
  if (status === 'PARTIALLY_DEMONSTRATED') return 'text-amber-400';
  if (status === 'NOT_DEMONSTRATED' || status === 'UNCERTAIN') return 'text-rose-400';
  return 'text-zinc-400';
}

function statusToneLight(status: string): string {
  if (status === 'DEMONSTRATED') return 'text-[#047857]';
  if (status === 'PARTIALLY_DEMONSTRATED') return 'text-[#b45309]';
  if (status === 'NOT_DEMONSTRATED' || status === 'UNCERTAIN') return 'text-[var(--ds-coral)]';
  return 'text-[var(--ds-text-muted)]';
}

export function CompetencyBreakdown({
  skillCode,
  assessmentResult,
  compact = false,
  tone = 'dark',
}: {
  skillCode: string;
  assessmentResult: AssessmentResult;
  compact?: boolean;
  tone?: 'dark' | 'light';
}) {
  const rows = assessmentResult.competencyResults.filter((row) => row.status !== 'NOT_TESTED');
  if (rows.length === 0) return null;

  const isLight = tone === 'light';
  const sectionClass = isLight
    ? compact
      ? 'rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-2.5'
      : 'mt-3 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-3'
    : compact
      ? 'mt-2.5 rounded-lg border border-zinc-800 bg-zinc-950/80 p-2.5'
      : 'mt-3 rounded-lg border border-emerald-800/40 bg-emerald-950/30 p-3';

  return (
    <section className={sectionClass}>
      <p
        className={
          isLight
            ? 'text-[10px] font-bold uppercase tracking-wider text-[var(--ds-text-muted)]'
            : 'text-[10px] font-bold uppercase tracking-wider text-emerald-400'
        }
      >
        Competency breakdown (read-only)
      </p>
      <p
        className={
          isLight ? 'mt-1 text-xs text-[var(--ds-text-secondary)]' : 'mt-1 text-xs text-zinc-300'
        }
      >
        Supported: {assessmentResult.highestAssessmentSupportedProficiency} · Confidence:{' '}
        {assessmentResult.confidence.toLowerCase()}
      </p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {rows.map((row) => (
          <li
            key={row.competencyId}
            className={
              isLight
                ? 'flex items-center justify-between gap-2 text-xs text-[var(--ds-text)]'
                : 'flex items-center justify-between gap-2 text-xs text-zinc-200'
            }
          >
            <span className="font-medium">{competencyLabel(skillCode, row.competencyId)}</span>
            <span className={isLight ? statusToneLight(row.status) : statusTone(row.status)}>
              {row.status.replaceAll('_', ' ').toLowerCase()} · {row.confidence.toLowerCase()}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
