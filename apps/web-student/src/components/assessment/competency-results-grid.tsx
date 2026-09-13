'use client';

import type { AssessmentResult } from '@smart/contracts';
import { Badge } from '@smart/ui';
import {
  COMPETENCY_STATUS_LABELS,
  competencyLabel,
  competencyStatusBadgeVariant,
  competencyStatusTone,
} from '@/lib/competency-display';

export function CompetencyResultsGrid({
  skillCode,
  assessmentResult,
  showNotTested = false,
  compact = false,
}: {
  skillCode: string;
  assessmentResult: AssessmentResult;
  showNotTested?: boolean;
  compact?: boolean;
}) {
  const rows = assessmentResult.competencyResults.filter(
    (row) => showNotTested || row.status !== 'NOT_TESTED',
  );
  if (rows.length === 0) return null;

  return (
    <section
      className={
        compact
          ? 'space-y-2'
          : 'rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] p-4'
      }
      aria-label="Competency breakdown"
    >
      <header className={compact ? 'space-y-0.5' : 'space-y-1'}>
        <p className="text-sm font-medium text-foreground">Competency map</p>
        {!compact ? (
          <p className="text-xs text-muted-foreground">
            How each capability area was assessed — not tested areas were skipped to reduce fatigue.
          </p>
        ) : null}
      </header>
      <ul className="mt-2 flex flex-col gap-2">
        {rows.map((row) => (
          <li
            key={row.competencyId}
            className="flex flex-wrap items-center justify-between gap-2 text-sm"
          >
            <span className="font-medium text-foreground">
              {competencyLabel(skillCode, row.competencyId)}
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${competencyStatusTone(row.status)}`}>
                {COMPETENCY_STATUS_LABELS[row.status]}
              </span>
              <Badge variant={competencyStatusBadgeVariant(row.status)} className="text-[10px]">
                {row.confidence.toLowerCase()} confidence
              </Badge>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
