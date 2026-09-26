'use client';

import { useEffect, useState } from 'react';
import type { GetEmployerSkillInspectionResponse } from '@smart/contracts';
import { AiExplanationPanel } from '@smart/ui';
import { matchingApi } from '../../lib/api';
import { mutedTextClass } from '../../lib/tpo-ui';

export function EmployerSkillInspectionPanel({
  studentId,
  skillCode,
  skillName,
}: {
  studentId: string;
  skillCode: string;
  skillName: string;
}) {
  const [data, setData] = useState<GetEmployerSkillInspectionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void matchingApi
      .inspectCandidateSkill(studentId, skillCode)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError('Skill inspection is unavailable for this candidate.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, skillCode]);

  if (loading) {
    return <p className={`text-sm ${mutedTextClass}`}>Loading skill inspection…</p>;
  }

  if (error || !data) {
    return error ? <p className="text-sm text-amber-800">{error}</p> : null;
  }

  const conclusions = [
    { key: 'verified', label: 'Verified record', value: data.verifiedVsAi.verified },
    { key: 'assessment', label: 'Assessment', value: data.verifiedVsAi.assessmentSupported },
    { key: 'inferred', label: 'AI inference', value: data.verifiedVsAi.evidenceInferred },
  ].filter(
    (entry): entry is { key: string; label: string; value: NonNullable<typeof entry.value> } =>
      entry.value != null,
  );

  return (
    <div
      className="mt-4 flex flex-col gap-3 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] p-4"
      data-testid="employer-skill-inspection"
    >
      <p className="text-sm font-semibold text-[var(--ds-text)]">Skill inspection — {skillName}</p>
      <AiExplanationPanel
        title="Level readout"
        explanation={data.whyThisLevel}
        tone={
          data.employerConfidenceIndicators.some((row) => row.tone === 'caution')
            ? 'warning'
            : 'info'
        }
      />
      <ul className="flex flex-wrap gap-2">
        {data.employerConfidenceIndicators.map((indicator) => (
          <li
            key={indicator.code}
            className={[
              'rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              indicator.tone === 'positive'
                ? 'bg-emerald-50 text-emerald-800'
                : indicator.tone === 'caution'
                  ? 'bg-amber-50 text-amber-900'
                  : 'bg-slate-100 text-slate-700',
            ].join(' ')}
          >
            {indicator.label}
          </li>
        ))}
      </ul>
      <p className={`text-xs ${mutedTextClass}`}>{data.verifiedVsAi.headline}</p>

      {conclusions.length > 0 ? (
        <ul className="flex flex-col gap-1.5 text-xs" data-testid="employer-conclusion-breakdown">
          {conclusions.map((entry) => (
            <li key={entry.key} className="flex items-center justify-between gap-2">
              <span className="text-[var(--ds-text)]">{entry.label}</span>
              <span className="flex items-center gap-2">
                <span className="text-[var(--ds-text-muted)]">
                  {entry.value.proficiency ?? 'No level'}
                </span>
                <span
                  className={[
                    'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-tight',
                    entry.value.claimType === 'VERIFIED_FACT'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-purple-50 text-purple-700',
                  ].join(' ')}
                >
                  {entry.value.claimType === 'VERIFIED_FACT' ? 'Verified fact' : 'AI inference'}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {data.competencyRows.length > 0 ? (
        <ul className="flex flex-col gap-1.5 text-xs" data-testid="employer-competency-rows">
          {data.competencyRows.slice(0, 6).map((row) => (
            <li
              key={row.competencyId}
              className="rounded-lg border border-[var(--ds-border-subtle)] px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-[var(--ds-text)]">{row.capability}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]">
                  {row.status.replaceAll('_', ' ').toLowerCase()}
                </span>
              </div>
              <p className="mt-1 text-[var(--ds-text-muted)]">{row.why}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {data.freshness.length > 0 ? (
        <div className="text-xs" data-testid="employer-freshness">
          <p className="font-medium text-[var(--ds-text)]">Evidence freshness</p>
          <ul className="mt-1 list-disc pl-4 text-[var(--ds-text-muted)]">
            {data.freshness.slice(0, 6).map((row) => (
              <li key={row.evidenceId}>
                {row.label}: {row.freshnessClass.toLowerCase()}
                {row.staleAffectsConfidence ? ' (may reduce confidence)' : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
