'use client';

import { useEffect, useState } from 'react';
import type { ProjectDefenseOutcomeDto } from '@smart/contracts';
import { Alert, Button } from '@smart/ui';
import { api } from '@/lib/api';

export function ProjectDefenseOutcomePanel({ projectId }: { projectId: string }) {
  const [outcome, setOutcome] = useState<ProjectDefenseOutcomeDto | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void api.projects
      .defenseOutcome(projectId)
      .then(setOutcome)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Could not load interview outcome.'),
      );
  }, [projectId]);

  async function submitAppeal() {
    setError(null);
    setMessage(null);
    try {
      await api.projects.appealDefense(projectId, { reason: appealReason.trim() });
      setMessage('Appeal submitted. A reviewer will re-check your defense.');
      setOutcome(await api.projects.defenseOutcome(projectId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Appeal failed.');
    }
  }

  if (!outcome) {
    return error ? (
      <Alert tone="danger" title="Outcome unavailable">
        {error}
      </Alert>
    ) : (
      <p className="text-sm text-muted-foreground">Loading outcome…</p>
    );
  }

  return (
    <div className="space-y-4">
      <Alert tone="info" title={`Project status: ${outcome.projectStatus}`}>
        Interview status: {outcome.interviewStatus}
        {outcome.grade ? ` · Defense score: ${outcome.grade.defenseScore}` : ''}
      </Alert>
      {outcome.grade?.justification ? (
        <p className="text-sm text-muted-foreground">{outcome.grade.justification}</p>
      ) : null}
      {outcome.canAppeal ? (
        <div className="space-y-2">
          <textarea
            className="w-full rounded-md border border-border bg-background p-2 text-sm"
            rows={3}
            placeholder="Explain why the result is materially incorrect (min 8 characters)"
            value={appealReason}
            onChange={(e) => setAppealReason(e.target.value)}
          />
          <Button
            type="button"
            onClick={() => void submitAppeal()}
            disabled={appealReason.trim().length < 8}
          >
            Submit appeal
          </Button>
        </div>
      ) : null}
      {outcome.appealOpen ? (
        <p className="text-sm text-muted-foreground">Your appeal is open for review.</p>
      ) : null}
      {message ? <Alert tone="success" title={message} /> : null}
      {error ? <Alert tone="danger" title={error} /> : null}
    </div>
  );
}
