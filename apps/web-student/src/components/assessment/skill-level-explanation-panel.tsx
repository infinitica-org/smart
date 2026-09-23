'use client';

import { useEffect, useState } from 'react';
import type { GetSkillLevelExplanationResponse } from '@smart/contracts';
import { AiExplanationPanel } from '@smart/ui';
import { api } from '@/lib/api';

export function SkillLevelExplanationPanel({ skillCode }: { skillCode: string }) {
  const [data, setData] = useState<GetSkillLevelExplanationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void api.evidence
      .getSkillLevelExplanation(skillCode)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError('We could not load the level explanation right now.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [skillCode]);

  if (loading) {
    return (
      <p className="text-sm text-[var(--text-muted)]" role="status">
        Loading why this level applies…
      </p>
    );
  }

  if (error || !data) {
    return error ? (
      <p className="text-sm text-amber-800 dark:text-amber-300" role="alert">
        {error}
      </p>
    ) : null;
  }

  return (
    <section
      className="flex flex-col gap-4"
      aria-label="Why this skill level"
      data-testid="skill-level-explanation"
    >
      <AiExplanationPanel
        title="Why this level"
        explanation={data.whyThisLevel}
        tone={
          data.verifiedVsAi.alignment === 'INFERENCE_DIVERGES_FROM_VERIFIED' ? 'warning' : 'info'
        }
      />

      <div className="rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] p-4 text-sm">
        <p className="font-medium text-[var(--text-primary)]">{data.verifiedVsAi.headline}</p>
        {data.verifiedVsAi.detail ? (
          <p className="mt-2 leading-relaxed text-[var(--text-muted)]">
            {data.verifiedVsAi.detail}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Basis: {data.basis.replaceAll('_', ' ').toLowerCase()} · Confidence:{' '}
          {data.confidence.toLowerCase()}
        </p>
      </div>

      {data.competencyRows.length > 0 ? (
        <ul className="flex flex-col gap-2 text-sm">
          {data.competencyRows.slice(0, 5).map((row) => (
            <li
              key={row.competencyId}
              className="rounded-lg border border-border bg-muted/40 px-3 py-2"
            >
              <p className="font-medium text-foreground">{row.capability}</p>
              <p className="mt-1 text-xs text-muted-foreground">{row.why}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {data.freshness.length > 0 ? (
        <div className="text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Evidence freshness</p>
          <ul className="mt-1 list-disc pl-4">
            {data.freshness.slice(0, 4).map((row) => (
              <li key={row.evidenceId}>
                {row.label}: {row.freshnessClass.toLowerCase()}
                {row.staleAffectsConfidence ? ' (may reduce confidence)' : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
