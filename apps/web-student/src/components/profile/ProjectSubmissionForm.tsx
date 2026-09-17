'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { isSmartApiError } from '@smart/api-client';
import { createPortal } from 'react-dom';
import type { GithubRepoSummary, ProjectDto } from '@smart/contracts';
import { AlertCircle, CheckCircle2, GitBranch, Plus, X } from 'lucide-react';
import { ProjectDetailModal } from '@/components/profile/projects/ProjectDetailModal';
import { ProjectEmptyState } from '@/components/profile/projects/ProjectEmptyState';
import { ProjectFormModal } from '@/components/profile/projects/ProjectFormModal';
import { ProjectList } from '@/components/profile/projects/ProjectList';
import { api } from '../../lib/api';
import { useOnboarding } from '../../lib/use-onboarding';
import { useFeatureFlag } from '../../lib/entitlements';
import { PROFILE_PROJECTS_HEADER_ACTIONS_ID } from '@/lib/profile-projects-header';
import { resolveGithubLogin } from '@/lib/github-login';
import { profilePrimaryButtonSmClass } from '@/lib/profile-ui-classes';
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
const README_PREFILL_MAX_CHARS = 7_800;

export function ProjectSubmissionForm() {
  const canSubmitProjects = useFeatureFlag('project_verification');
  const [fields, setFields] = useState<ProjectFormFields>(EMPTY_PROJECT_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProjectFormFields, string>>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectDto[] | null>(null);
  const [justSubmitted, setJustSubmitted] = useState<ProjectDto | null>(null);
  const [isPending, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [detailProject, setDetailProject] = useState<ProjectDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [repos, setRepos] = useState<GithubRepoSummary[] | null>(null);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);
  const [importingRepo, setImportingRepo] = useState<string | null>(null);
  const [importNote, setImportNote] = useState<string | null>(null);

  const { data: onboardingData } = useOnboarding();
  const githubLogin = useMemo(
    () => resolveGithubLogin(onboardingData?.profile, onboardingData?.draft),
    [onboardingData?.profile, onboardingData?.draft],
  );

  useEffect(() => {
    void api.projects
      .listMine()
      .then((res) => setProjects(res.projects))
      .catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    if (!projects?.some((p) => isProcessingStatus(p))) return undefined;
    const timer = window.setInterval(() => {
      void api.projects
        .listMine()
        .then((res) => setProjects(res.projects))
        .catch(() => undefined);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [projects]);

  const viewProject = (project: ProjectDto) => {
    setDetailProject(project);
    setDetailLoading(true);
    void api.projects
      .get(project.projectId)
      .then((full) => setDetailProject(full))
      .catch(() => undefined)
      .finally(() => setDetailLoading(false));
  };

  const setField = (key: keyof ProjectFormFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const openForm = (options?: { showGithubImport?: boolean }) => {
    setFormOpen(true);
    if (options?.showGithubImport) {
      setShowImport(true);
      loadReposIfNeeded();
    }
  };

  const closeForm = () => {
    if (isPending) return;
    setFormOpen(false);
    setShowImport(false);
  };

  const startAnother = () => {
    setJustSubmitted(null);
    setFields(EMPTY_PROJECT_FORM);
    setFieldErrors({});
    setError(null);
    setImportNote(null);
    openForm();
  };

  const loadReposIfNeeded = useCallback(
    (options?: { force?: boolean }) => {
      if (!githubLogin || reposLoading) return;
      if (!options?.force && repos !== null) return;

      setReposLoading(true);
      setReposError(null);
      api.users
        .listGithubRepos({ login: githubLogin })
        .then((res) => setRepos(res.repos))
        .catch((err: unknown) => {
          if (isSmartApiError(err) && err.message) {
            setReposError(err.message);
            return;
          }
          setReposError('Could not load your GitHub repos right now.');
        })
        .finally(() => setReposLoading(false));
    },
    [githubLogin, repos, reposLoading],
  );

  useEffect(() => {
    setRepos(null);
    setReposError(null);
  }, [githubLogin]);

  useEffect(() => {
    if (showImport && githubLogin) {
      loadReposIfNeeded();
    }
  }, [showImport, githubLogin, loadReposIfNeeded]);

  const toggleImport = () => {
    const next = !showImport;
    setShowImport(next);
    if (next) loadReposIfNeeded();
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
          setFormOpen(false);
          setShowImport(false);
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

  const headerActionsEl =
    typeof document !== 'undefined'
      ? document.getElementById(PROFILE_PROJECTS_HEADER_ACTIONS_ID)
      : null;

  const headerAddButton =
    canSubmitProjects && headerActionsEl
      ? createPortal(
          <button type="button" onClick={() => openForm()} className={profilePrimaryButtonSmClass}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Project
          </button>,
          headerActionsEl,
        )
      : null;

  return (
    <section className="flex flex-col gap-6" aria-labelledby="projects-portfolio-heading">
      {headerAddButton}

      <p id="projects-portfolio-heading" className="sr-only">
        Project portfolio
      </p>

      {processing && justSubmitted ? (
        <div
          className="rounded-xl border border-sky-200 bg-sky-50/90 px-4 py-3 text-sm text-[var(--ds-text-secondary)]"
          aria-live="polite"
        >
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-sky-600" aria-hidden="true" />
            <div>
              <p className="font-semibold text-[var(--ds-text)]">{processing.title}</p>
              <p className="mt-1 leading-relaxed">{processing.body}</p>
            </div>
          </div>
        </div>
      ) : null}

      {justSubmitted ? (
        <div>
          <button type="button" onClick={startAnother} className={profilePrimaryButtonSmClass}>
            Submit another project
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto shrink-0 text-red-800 hover:text-red-950"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {importNote && formOpen ? (
        <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{importNote}</span>
        </div>
      ) : null}

      {!canSubmitProjects ? (
        <div className="rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-hover)] p-5 text-sm">
          <p className="font-semibold text-[var(--ds-text)]">Project verification</p>
          <p className="mt-2 text-[var(--ds-text-muted)]">
            Project verification isn&apos;t on your institution&apos;s plan. Ask your TPO to upgrade
            the plan to submit new projects for verification.
          </p>
        </div>
      ) : null}

      {displayProjects.length === 0 && canSubmitProjects ? (
        <ProjectEmptyState
          canSubmit={canSubmitProjects}
          onAdd={() => openForm()}
          onImportGithub={() => openForm({ showGithubImport: true })}
        />
      ) : displayProjects.length > 0 ? (
        <ProjectList
          projects={displayProjects}
          topStack={topStack}
          canSubmit={canSubmitProjects}
          onView={viewProject}
          onAdd={() => openForm()}
        />
      ) : null}

      {canSubmitProjects && displayProjects.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[var(--ds-text-secondary)]">
            Tip: Import projects directly from GitHub to save time.
          </p>
          <button
            type="button"
            onClick={() => openForm({ showGithubImport: true })}
            className="inline-flex items-center gap-1.5 font-semibold text-[var(--ds-green)] hover:underline"
          >
            <GitBranch className="h-4 w-4" aria-hidden="true" />
            Import from GitHub →
          </button>
        </div>
      ) : null}

      <ProjectFormModal
        open={formOpen && canSubmitProjects}
        fields={fields}
        fieldErrors={fieldErrors}
        isPending={isPending}
        githubLogin={githubLogin}
        showImport={showImport}
        repos={repos}
        reposLoading={reposLoading}
        reposError={reposError}
        importingRepo={importingRepo}
        onClose={closeForm}
        onFieldChange={setField}
        onSubmit={submit}
        onToggleImport={toggleImport}
        onRetryRepos={() => loadReposIfNeeded({ force: true })}
        onSelectRepo={importRepo}
        onManual={() => setShowImport(false)}
      />

      <ProjectDetailModal
        project={detailProject}
        loading={detailLoading}
        onClose={() => setDetailProject(null)}
      />
    </section>
  );
}
