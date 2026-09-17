'use client';

import type { GithubRepoSummary } from '@smart/contracts';
import { Input } from '@smart/ui';
import { X } from 'lucide-react';
import { GithubImportPanel } from '@/components/profile/projects/GithubImportPanel';
import type { ProjectFormFields } from '@/lib/project-submission';
import { profilePrimaryButtonClass, profileSecondaryButtonSmClass } from '@/lib/profile-ui-classes';

type ProjectFormModalProps = {
  open: boolean;
  fields: ProjectFormFields;
  fieldErrors: Partial<Record<keyof ProjectFormFields, string>>;
  isPending: boolean;
  githubLogin: string | null;
  showImport: boolean;
  repos: GithubRepoSummary[] | null;
  reposLoading: boolean;
  reposError: string | null;
  importingRepo: string | null;
  onClose: () => void;
  onFieldChange: (key: keyof ProjectFormFields, value: string) => void;
  onSubmit: () => void;
  onToggleImport: () => void;
  onRetryRepos: () => void;
  onSelectRepo: (repo: GithubRepoSummary) => void;
  onManual: () => void;
};

const textareaClass =
  'rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-2 text-sm text-[var(--ds-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-green)]/30';

export function ProjectFormModal({
  open,
  fields,
  fieldErrors,
  isPending,
  githubLogin,
  showImport,
  repos,
  reposLoading,
  reposError,
  importingRepo,
  onClose,
  onFieldChange,
  onSubmit,
  onToggleImport,
  onRetryRepos,
  onSelectRepo,
  onManual,
}: ProjectFormModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-form-title"
        className="max-h-[min(92dvh,880px)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)] shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-[1] flex items-start justify-between gap-3 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-6 py-4">
          <div>
            <h2 id="project-form-title" className="text-lg font-semibold text-[var(--ds-text)]">
              Add project
            </h2>
            <p className="mt-1 text-sm text-[var(--ds-text-muted)]">
              Build a clear project story that SMART can evaluate.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-hover)]"
            aria-label="Close add project dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex flex-col gap-6 px-6 py-5">
          <GithubImportPanel
            githubLogin={githubLogin}
            showImport={showImport}
            repos={repos}
            reposLoading={reposLoading}
            reposError={reposError}
            importingRepo={importingRepo}
            onToggle={onToggleImport}
            onRetry={onRetryRepos}
            onSelectRepo={onSelectRepo}
            onManual={onManual}
          />

          <section aria-labelledby="project-overview-heading">
            <h3
              id="project-overview-heading"
              className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]"
            >
              Step 1 · Project overview
            </h3>
            <div className="mt-3 grid gap-4">
              <Input
                label="Title"
                name="title"
                value={fields.title}
                error={fieldErrors.title}
                disabled={isPending}
                onChange={(event) => onFieldChange('title', event.target.value)}
              />
              <div className="flex flex-col gap-1.5 text-sm">
                <label className="font-medium text-[var(--ds-text)]" htmlFor="problem">
                  Problem
                </label>
                <p className="text-xs text-[var(--ds-text-muted)]">
                  What problem were you solving?
                </p>
                <textarea
                  id="problem"
                  name="problem"
                  rows={4}
                  value={fields.problem}
                  disabled={isPending}
                  onChange={(event) => onFieldChange('problem', event.target.value)}
                  className={textareaClass}
                  aria-invalid={fieldErrors.problem ? true : undefined}
                />
                {fieldErrors.problem ? (
                  <span className="text-xs text-red-600">{fieldErrors.problem}</span>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5 text-sm">
                <label className="font-medium text-[var(--ds-text)]" htmlFor="approach">
                  Approach
                </label>
                <p className="text-xs text-[var(--ds-text-muted)]">
                  How did you approach the problem?
                </p>
                <textarea
                  id="approach"
                  name="approach"
                  rows={4}
                  value={fields.approach}
                  disabled={isPending}
                  onChange={(event) => onFieldChange('approach', event.target.value)}
                  className={textareaClass}
                />
                {fieldErrors.approach ? (
                  <span className="text-xs text-red-600">{fieldErrors.approach}</span>
                ) : null}
              </div>
            </div>
          </section>

          <section aria-labelledby="project-implementation-heading">
            <h3
              id="project-implementation-heading"
              className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]"
            >
              Step 2 · Implementation
            </h3>
            <div className="mt-3 grid gap-4">
              <Input
                label="Technology stack"
                name="stack"
                value={fields.stack}
                error={fieldErrors.stack}
                disabled={isPending}
                onChange={(event) => onFieldChange('stack', event.target.value)}
              />
              <p className="-mt-2 text-xs text-[var(--ds-text-muted)]">
                Separate technologies with commas.
              </p>
              <div className="flex flex-col gap-1.5 text-sm">
                <label className="font-medium text-[var(--ds-text)]" htmlFor="outcome">
                  Outcome
                </label>
                <p className="text-xs text-[var(--ds-text-muted)]">What did the project achieve?</p>
                <textarea
                  id="outcome"
                  name="outcome"
                  rows={4}
                  value={fields.outcome}
                  disabled={isPending}
                  onChange={(event) => onFieldChange('outcome', event.target.value)}
                  className={textareaClass}
                />
                {fieldErrors.outcome ? (
                  <span className="text-xs text-red-600">{fieldErrors.outcome}</span>
                ) : null}
              </div>
            </div>
          </section>

          <section aria-labelledby="project-links-heading">
            <h3
              id="project-links-heading"
              className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]"
            >
              Step 3 · Links & evidence
            </h3>
            <div className="mt-3 grid gap-4">
              <Input
                label="GitHub link (optional)"
                name="githubUrl"
                type="url"
                placeholder="https://github.com/org/repo"
                value={fields.githubUrl}
                error={fieldErrors.githubUrl}
                disabled={isPending}
                onChange={(event) => onFieldChange('githubUrl', event.target.value)}
              />
              <Input
                label="Live link (optional)"
                name="liveUrl"
                type="url"
                placeholder="https://your-project.example.com"
                value={fields.liveUrl}
                error={fieldErrors.liveUrl}
                disabled={isPending}
                onChange={(event) => onFieldChange('liveUrl', event.target.value)}
              />
            </div>
          </section>
        </div>

        <footer className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className={profileSecondaryButtonSmClass}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className={profilePrimaryButtonClass}
            disabled={isPending}
          >
            {isPending ? 'Submitting…' : 'Submit project'}
          </button>
        </footer>
      </div>
    </div>
  );
}
