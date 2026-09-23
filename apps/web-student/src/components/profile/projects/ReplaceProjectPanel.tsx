'use client';

import type { ProjectDto, ReplaceProjectResponse } from '@smart/contracts';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { replaceStudentProject } from '@/lib/project-replace';

type ReplaceProjectPanelProps = {
  project: ProjectDto;
  candidates: ProjectDto[];
  onReplaced: (result: ReplaceProjectResponse) => void;
};

export function ReplaceProjectPanel({ project, candidates, onReplaced }: ReplaceProjectPanelProps) {
  const [replacementId, setReplacementId] = useState(candidates[0]?.projectId ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  if (project.isActive === false || candidates.length === 0) {
    return null;
  }

  const handleReplace = async () => {
    if (!replacementId) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await replaceStudentProject(project.projectId, {
        replacementProjectId: replacementId,
      });
      setConfirmed(true);
      onReplaced(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to replace project.');
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <section className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-[var(--ds-text-secondary)]">
        <p className="font-semibold text-[var(--ds-text)]">Project replaced</p>
        <p className="mt-1">
          <span className="font-medium">{project.title}</span> is now inactive. Your current project
          is{' '}
          <span className="font-medium">
            {candidates.find((c) => c.projectId === replacementId)?.title ?? 'the replacement'}
          </span>
          .
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-hover)]/40 p-4">
      <h4 className="text-sm font-semibold text-[var(--ds-text)]">Replace this project</h4>
      <p className="mt-1 text-sm text-[var(--ds-text-secondary)]">
        Choose another project to become your current one.{' '}
        <span className="font-medium text-[var(--ds-text)]">{project.title}</span> will become
        inactive. Historical verification data is preserved.
      </p>
      <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]">
        Replacement project
        <select
          className="mt-1.5 w-full rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-2 text-sm text-[var(--ds-text)]"
          value={replacementId}
          onChange={(event) => setReplacementId(event.target.value)}
          disabled={submitting}
        >
          {candidates.map((candidate) => (
            <option key={candidate.projectId} value={candidate.projectId}>
              {candidate.title}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void handleReplace()}
        disabled={submitting || !replacementId}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--ds-green)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        Replace project
      </button>
    </section>
  );
}
