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

export function CompetencyBreakdown({
  skillCode,
  assessmentResult,
  compact = false,
}: {
  skillCode: string;
  assessmentResult: AssessmentResult;
  compact?: boolean;
}) {
  const rows = assessmentResult.competencyResults.filter((row) => row.status !== 'NOT_TESTED');
  if (rows.length === 0) return null;

  return (
    <section
      className={
        compact
          ? 'mt-2.5 rounded-lg border border-zinc-800 bg-zinc-950/80 p-2.5'
          : 'mt-3 rounded-lg border border-emerald-800/40 bg-emerald-950/30 p-3'
      }
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
        Competency breakdown (read-only)
      </p>
      <p className="mt-1 text-xs text-zinc-300">
        Supported: {assessmentResult.highestAssessmentSupportedProficiency} · Confidence:{' '}
        {assessmentResult.confidence.toLowerCase()}
      </p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {rows.map((row) => (
          <li
            key={row.competencyId}
            className="flex items-center justify-between gap-2 text-xs text-zinc-200"
          >
            <span className="font-medium">{competencyLabel(skillCode, row.competencyId)}</span>
            <span className={statusTone(row.status)}>
              {row.status.replaceAll('_', ' ').toLowerCase()} · {row.confidence.toLowerCase()}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
