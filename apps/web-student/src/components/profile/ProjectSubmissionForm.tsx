'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import type { GithubRepoSummary, ProjectDto } from '@smart/contracts';
import { Alert, Button, Input } from '@smart/ui';
import { GitBranch, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useFeatureFlag } from '../../lib/entitlements';
import {
  EMPTY_PROJECT_FORM,
  buildCreateProjectRequest,
  fieldErrorsFromZod,
  isProcessingStatus,
  isZodLikeError,
  processingStateCopy,
  topStackTags,
  type ProjectFormFields,
} from '../../lib/project-submission';

const POLL_MS = 4_000;
/** CreateProjectRequestSchema caps template fields at 8,000 chars. */
const README_PREFILL_MAX_CHARS = 7_800;

/** Tailwind can't see classes built from a template literal, so this stays a literal lookup. */
const STATUS_BADGE_TONE: Record<'info' | 'success' | 'warning' | 'danger', string> = {
  info: 'border-info/40 bg-info/10',
  success: 'border-success/40 bg-success/10',
  warning: 'border-warning/40 bg-warning/10',
  danger: 'border-danger/40 bg-danger/10',
};

export function ProjectSubmissionForm() {
  const canSubmitProjects = useFeatureFlag('project_verification');
  const [fields, setFields] = useState<ProjectFormFields>(EMPTY_PROJECT_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProjectFormFields, string>>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectDto[] | null>(null);
  /**
   * Held separately from `projects` — the initial `listMine()` fetch and a fresh
   * `create()` response can resolve in either order, and this must never let the
   * slower one silently erase the just-submitted project from view.
   */
  const [justSubmitted, setJustSubmitted] = useState<ProjectDto | null>(null);
  const [isPending, startTransition] = useTransition();

  const [githubLogin, setGithubLogin] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [repos, setRepos] = useState<GithubRepoSummary[] | null>(null);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);
  const [importingRepo, setImportingRepo] = useState<string | null>(null);
  const [importNote, setImportNote] = useState<string | null>(null);

  useEffect(() => {
    void api.users
      .getOnboarding()
      .then((res) => setGithubLogin(res.profile?.socialVerification?.github?.login ?? null))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void api.projects
      .listMine()
      .then((res) => setProjects(res.projects))
      .catch(() => setProjects([]));
  }, []);

  /** A student can have several projects in flight — poll the whole list, not just the last one. */
  useEffect(() => {
    if (!projects?.some((p) => isProcessingStatus(p.status))) return undefined;
    const timer = window.setInterval(() => {
      void api.projects
        .listMine()
        .then((res) => setProjects(res.projects))
        .catch(() => undefined);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [projects]);

  const setField = (key: keyof ProjectFormFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const startAnother = () => {
    setJustSubmitted(null);
    setFields(EMPTY_PROJECT_FORM);
    setFieldErrors({});
    setError(null);
    setImportNote(null);
  };

  const toggleImport = () => {
    const next = !showImport;
    setShowImport(next);
    if (next && githubLogin && repos === null && !reposLoading) {
      setReposLoading(true);
      setReposError(null);
      api.users
        .listGithubRepos({ login: githubLogin })
        .then((res) => setRepos(res.repos))
        .catch(() => setReposError('Could not load your GitHub repos right now.'))
        .finally(() => setReposLoading(false));
    }
  };

  const importRepo = (repo: GithubRepoSummary) => {
    setImportingRepo(repo.fullName);
    setImportNote(null);
    const repoName = repo.fullName.split('/')[1] ?? repo.fullName;
    api.users
      .githubRepoReadme({ fullName: repo.fullName })
      .then((res) => {
        setFields((prev) => ({
          ...prev,
          title: prev.title || repoName,
          approach: res.readme ? res.readme.slice(0, README_PREFILL_MAX_CHARS) : prev.approach,
          stack: prev.stack || (repo.primaryLanguage ?? prev.stack),
          githubUrl: repo.htmlUrl,
        }));
        if (!res.readme)
          setImportNote(
            `Imported ${repoName} — it has no README, so fill in the approach yourself.`,
          );
      })
      .catch(() => {
        setFields((prev) => ({
          ...prev,
          title: prev.title || repoName,
          stack: prev.stack || (repo.primaryLanguage ?? prev.stack),
          githubUrl: repo.htmlUrl,
        }));
        setImportNote(
          `Imported ${repoName}, but couldn't fetch its README — fill in the approach yourself.`,
        );
      })
      .finally(() => {
        setImportingRepo(null);
        setShowImport(false);
      });
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
          setProjects((prev) =>
            (prev ?? []).some((p) => p.projectId === created.projectId)
              ? prev
              : [created, ...(prev ?? [])],
          );
          setJustSubmitted(created);
          setFields(EMPTY_PROJECT_FORM);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to submit project.');
        }
      })();
    });
  };

  const displayProjects = useMemo(() => {
    const base = projects ?? [];
    if (justSubmitted && !base.some((p) => p.projectId === justSubmitted.projectId)) {
      return [justSubmitted, ...base];
    }
    return base;
  }, [projects, justSubmitted]);

  const processing = justSubmitted
    ? processingStateCopy(
        displayProjects.find((p) => p.projectId === justSubmitted.projectId) ?? justSubmitted,
      )
    : null;
  const topStack = displayProjects.length > 0 ? topStackTags(displayProjects) : [];

  return (
    <section className="flex flex-col gap-4" aria-labelledby="project-submit-heading">
      <div>
        <h2 id="project-submit-heading" className="text-lg font-medium">
          Submit a project
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Template: problem, approach, stack, outcome. Import a GitHub repo to prefill it, or add it
          manually. A Loom walkthrough and a live link are optional. Submit queues verification and
          shows a processing state.
        </p>
      </div>

      {displayProjects.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-lg border border-[var(--surface-border)] p-4">
          {topStack.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium tracking-wide text-[var(--text-secondary)] uppercase">
                Top stack
              </span>
              {topStack.map(({ tag, count }) => (
                <span
                  key={tag}
                  className="rounded-full border border-[var(--surface-border)] px-2 py-0.5 text-xs"
                >
                  {tag}
                  {count > 1 ? (
                    <span className="text-[var(--text-secondary)]"> · {count}</span>
                  ) : null}
                </span>
              ))}
            </div>
          ) : null}

          <ul className="flex flex-col gap-2">
            {displayProjects.map((p) => {
              const copy = processingStateCopy(p);
              return (
                <li
                  key={p.projectId}
                  className="flex flex-col gap-1.5 rounded-md border border-[var(--surface-border)] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{p.title}</span>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE_TONE[copy.tone]}`}
                    >
                      {copy.title}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {p.stack
                      .split(',')
                      .map((tag) => tag.trim())
                      .filter(Boolean)
                      .map((tag) => (
                        <span
                          key={tag}
                          className="rounded border border-[var(--surface-border)] px-1.5 py-0.5 text-[11px] text-[var(--text-secondary)]"
                        >
                          {tag}
                        </span>
                      ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {processing ? (
        <Alert tone={processing.tone} title={processing.title} aria-live="polite">
          {processing.body}
        </Alert>
      ) : null}

      {justSubmitted ? (
        <div>
          <Button type="button" variant="outline" onClick={startAnother}>
            Submit another project
          </Button>
        </div>
      ) : null}

      {error ? (
        <Alert tone="danger" title="Could not submit">
          {error}
        </Alert>
      ) : null}

      {importNote ? (
        <Alert tone="info" title="Imported from GitHub">
          {importNote}
        </Alert>
      ) : null}

      {canSubmitProjects ? (
        <>
          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" disabled={isPending} onClick={toggleImport}>
              <GitBranch className="h-4 w-4" />{' '}
              {showImport ? 'Hide GitHub repos' : 'Import from GitHub'}
            </Button>

            {showImport ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-sm">
                {!githubLogin ? (
                  <p className="text-gray-500">
                    No GitHub account connected. Connect one from onboarding, or just fill this in
                    manually below.
                  </p>
                ) : reposLoading ? (
                  <p className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading your repos…
                  </p>
                ) : reposError ? (
                  <p className="text-red-600">{reposError}</p>
                ) : repos && repos.length === 0 ? (
                  <p className="text-gray-500">No public repos found for {githubLogin}.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {(repos ?? []).map((repo) => (
                      <li key={repo.id}>
                        <button
                          type="button"
                          onClick={() => importRepo(repo)}
                          disabled={importingRepo !== null}
                          className="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left hover:bg-gray-100 disabled:opacity-50"
                        >
                          <span className="flex items-center gap-2 font-medium">
                            {repo.fullName}
                            {importingRepo === repo.fullName ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : null}
                          </span>
                          {repo.description ? (
                            <span className="text-xs text-[var(--text-secondary)]">
                              {repo.description}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4">
            <Input
              label="Title"
              name="title"
              value={fields.title}
              error={fieldErrors.title}
              disabled={isPending}
              onChange={(event) => setField('title', event.target.value)}
            />
            <label className="flex flex-col gap-1.5 text-sm" htmlFor="problem">
              <span className="font-medium">Problem</span>
              <textarea
                id="problem"
                name="problem"
                rows={4}
                value={fields.problem}
                disabled={isPending}
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
                disabled={isPending}
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
              disabled={isPending}
              onChange={(event) => setField('stack', event.target.value)}
            />
            <label className="flex flex-col gap-1.5 text-sm" htmlFor="outcome">
              <span className="font-medium">Outcome</span>
              <textarea
                id="outcome"
                name="outcome"
                rows={4}
                value={fields.outcome}
                disabled={isPending}
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
              disabled={isPending}
              onChange={(event) => setField('loomUrl', event.target.value)}
            />
            <Input
              label="GitHub link (optional)"
              name="githubUrl"
              type="url"
              placeholder="https://github.com/org/repo"
              value={fields.githubUrl}
              error={fieldErrors.githubUrl}
              disabled={isPending}
              onChange={(event) => setField('githubUrl', event.target.value)}
            />
            <Input
              label="Live link (optional)"
              name="liveUrl"
              type="url"
              placeholder="https://your-project.example.com"
              value={fields.liveUrl}
              error={fieldErrors.liveUrl}
              disabled={isPending}
              onChange={(event) => setField('liveUrl', event.target.value)}
            />
          </div>

          <div>
            <Button type="button" disabled={isPending} onClick={submit}>
              {isPending ? 'Submitting…' : 'Submit project'}
            </Button>
          </div>
        </>
      ) : (
        <Alert tone="info" title="Project verification isn't on your institution's plan">
          Ask your TPO to upgrade the plan to submit new projects for verification.
        </Alert>
      )}
    </section>
  );
}
