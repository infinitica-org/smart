'use client';

import { useEffect, useState, useTransition } from 'react';
import type { ProjectDto } from '@smart/contracts';
import { Alert, Button, Input } from '@smart/ui';
import { api } from '../../lib/api';
import {
  EMPTY_PROJECT_FORM,
  buildCreateProjectRequest,
  fieldErrorsFromZod,
  isProcessingStatus,
  isZodLikeError,
  processingStateCopy,
  type ProjectFormFields,
} from '../../lib/project-submission';

const POLL_MS = 4_000;

export function ProjectSubmissionForm() {
  const [fields, setFields] = useState<ProjectFormFields>(EMPTY_PROJECT_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProjectFormFields, string>>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!project || !isProcessingStatus(project.status)) return undefined;
    const timer = window.setInterval(() => {
      void api.projects
        .get(project.projectId)
        .then(setProject)
        .catch(() => undefined);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [project]);

  const setField = (key: keyof ProjectFormFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const submit = () => {
    setError(null);
    setFieldErrors({});
    let body;
    try {
      body = buildCreateProjectRequest(fields);
    } catch (err) {
      if (isZodLikeError(err)) {
        setFieldErrors(fieldErrorsFromZod(err));
        setError('Fix the highlighted template fields before submitting.');
        return;
      }
      throw err;
    }

    startTransition(() => {
      void (async () => {
        try {
          const created = await api.projects.create(body);
          setProject(created);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to submit project.');
        }
      })();
    });
  };

  const processing = project ? processingStateCopy(project) : null;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="project-submit-heading">
      <div>
        <h2 id="project-submit-heading" className="text-lg font-medium">
          Submit a project
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Template: problem, approach, stack, outcome. Add a Loom walkthrough and an optional GitHub
          link. Submit queues verification and shows a processing state.
        </p>
      </div>

      {processing ? (
        <Alert tone={processing.tone} title={processing.title} aria-live="polite">
          {processing.body}
        </Alert>
      ) : null}

      {error ? (
        <Alert tone="danger" title="Could not submit">
          {error}
        </Alert>
      ) : null}

      <div className="grid gap-4">
        <Input
          label="Title"
          name="title"
          value={fields.title}
          error={fieldErrors.title}
          disabled={isPending || Boolean(project)}
          onChange={(event) => setField('title', event.target.value)}
        />
        <label className="flex flex-col gap-1.5 text-sm" htmlFor="problem">
          <span className="font-medium">Problem</span>
          <textarea
            id="problem"
            name="problem"
            rows={4}
            value={fields.problem}
            disabled={isPending || Boolean(project)}
            onChange={(event) => setField('problem', event.target.value)}
            className="rounded-lg border border-[var(--surface-border)] bg-transparent px-3 py-2 text-sm"
            aria-invalid={fieldErrors.problem ? true : undefined}
          />
          {fieldErrors.problem ? (
            <span className="text-xs text-red-400">{fieldErrors.problem}</span>
          ) : null}
        </label>
        <label className="flex flex-col gap-1.5 text-sm" htmlFor="approach">
          <span className="font-medium">Approach</span>
          <textarea
            id="approach"
            name="approach"
            rows={4}
            value={fields.approach}
            disabled={isPending || Boolean(project)}
            onChange={(event) => setField('approach', event.target.value)}
            className="rounded-lg border border-[var(--surface-border)] bg-transparent px-3 py-2 text-sm"
          />
          {fieldErrors.approach ? (
            <span className="text-xs text-red-400">{fieldErrors.approach}</span>
          ) : null}
        </label>
        <Input
          label="Stack"
          name="stack"
          value={fields.stack}
          error={fieldErrors.stack}
          disabled={isPending || Boolean(project)}
          onChange={(event) => setField('stack', event.target.value)}
        />
        <label className="flex flex-col gap-1.5 text-sm" htmlFor="outcome">
          <span className="font-medium">Outcome</span>
          <textarea
            id="outcome"
            name="outcome"
            rows={4}
            value={fields.outcome}
            disabled={isPending || Boolean(project)}
            onChange={(event) => setField('outcome', event.target.value)}
            className="rounded-lg border border-[var(--surface-border)] bg-transparent px-3 py-2 text-sm"
          />
          {fieldErrors.outcome ? (
            <span className="text-xs text-red-400">{fieldErrors.outcome}</span>
          ) : null}
        </label>
        <Input
          label="Loom link"
          name="loomUrl"
          type="url"
          placeholder="https://www.loom.com/share/…"
          value={fields.loomUrl}
          error={fieldErrors.loomUrl}
          disabled={isPending || Boolean(project)}
          onChange={(event) => setField('loomUrl', event.target.value)}
        />
        <Input
          label="GitHub link (optional)"
          name="githubUrl"
          type="url"
          placeholder="https://github.com/org/repo"
          value={fields.githubUrl}
          error={fieldErrors.githubUrl}
          disabled={isPending || Boolean(project)}
          onChange={(event) => setField('githubUrl', event.target.value)}
        />
      </div>

      <div>
        <Button type="button" disabled={isPending || Boolean(project)} onClick={submit}>
          {isPending ? 'Submitting…' : 'Submit project'}
        </Button>
      </div>
    </section>
  );
}
