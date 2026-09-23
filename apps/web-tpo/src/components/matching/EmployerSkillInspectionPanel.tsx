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
    </div>
  );
}
