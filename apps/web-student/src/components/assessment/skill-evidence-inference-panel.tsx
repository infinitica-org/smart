'use client';

import { useEffect, useState } from 'react';
import type { GetSkillEvidenceInferenceResponse } from '@smart/contracts';
import { PROFICIENCY_LABELS } from '@/lib/skill-declarations';
import { api } from '@/lib/api';

export function SkillEvidenceInferencePanel({ skillCode }: { skillCode: string }) {
  const [data, setData] = useState<GetSkillEvidenceInferenceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void api.evidence
      .getSkillEvidenceInference(skillCode)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError('We could not load evidence-based skill inference right now.');
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
        Loading evidence-based skill level…
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

  const inferredLabel = data.inferredProficiency
    ? (PROFICIENCY_LABELS[data.inferredProficiency] ?? data.inferredProficiency)
    : 'Not inferred yet';

  return (
    <section
      className="rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] p-4 text-sm"
      aria-label="Evidence-based skill inference"
      data-testid="skill-evidence-inference"
    >
      <p className="font-medium text-[var(--text-primary)]">Evidence-fused level</p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
        This is computed from linked projects, assessments, and verification signals. It is separate
        from your verified claim level on your profile.
      </p>
      <p className="mt-3 text-2xl font-bold text-[var(--text-primary)]">{inferredLabel}</p>
      <p className="mt-2 text-[var(--text-muted)]">
        Outcome: {data.outcome.replaceAll('_', ' ').toLowerCase()} · Confidence:{' '}
        {data.confidence.toLowerCase()}
        {data.evidenceCount > 0 ? ` · ${String(data.evidenceCount)} evidence signal(s)` : ''}
      </p>
      {data.outcome === 'INSUFFICIENT_EVIDENCE' ? (
        <p className="mt-3 text-amber-800 dark:text-amber-300">
          Add or verify more project evidence to improve this inference.
        </p>
      ) : null}
    </section>
  );
}
