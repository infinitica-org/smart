'use client';

import type { GithubRepoSummary } from '@smart/contracts';
import { GitBranch, Loader2 } from 'lucide-react';
import { formatRepoUpdatedAt } from '@/components/profile/projects/project-presenters';
import {
  profilePrimaryButtonSmClass,
  profileSecondaryButtonSmClass,
} from '@/lib/profile-ui-classes';

type GithubImportPanelProps = {
  githubLogin: string | null;
  showImport: boolean;
  repos: GithubRepoSummary[] | null;
  reposLoading: boolean;
  reposError: string | null;
  importingRepo: string | null;
  onToggle: () => void;
  onRetry: () => void;
  onSelectRepo: (repo: GithubRepoSummary) => void;
  onManual: () => void;
};

export function GithubImportPanel({
  githubLogin,
  showImport,
  repos,
  reposLoading,
  reposError,
  importingRepo,
  onToggle,
  onRetry,
  onSelectRepo,
  onManual,
}: GithubImportPanelProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-hover)]/40 p-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--ds-text)]">Import from GitHub</h3>
        <p className="mt-1 text-xs leading-relaxed text-[var(--ds-text-muted)]">
          Connect your GitHub account and select a repository to prefill project details.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onToggle} className={profileSecondaryButtonSmClass}>
          <GitBranch className="h-4 w-4" aria-hidden="true" />
          {showImport ? 'Hide repositories' : 'Import from GitHub'}
        </button>
        <button type="button" onClick={onManual} className={profileSecondaryButtonSmClass}>
          Add manually
        </button>
      </div>

      {showImport ? (
        <div className="mt-1 flex flex-col gap-2">
          {!githubLogin ? (
            <p className="text-xs text-[var(--ds-text-muted)]">
              Add your GitHub profile URL under Professional Links or onboarding, then try again —
              or add project details manually.
            </p>
          ) : reposLoading ? (
            <p className="flex items-center gap-2 text-xs text-[var(--ds-text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading your repositories…
            </p>
          ) : reposError ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-red-700">{reposError}</p>
              <button type="button" onClick={onRetry} className={profileSecondaryButtonSmClass}>
                Retry loading repositories
              </button>
            </div>
          ) : repos && repos.length === 0 ? (
            <p className="text-xs text-[var(--ds-text-muted)]">
              No public repos found for {githubLogin}.
            </p>
          ) : (
            <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {(repos ?? []).map((repo) => {
                const repoName = repo.fullName.split('/')[1] ?? repo.fullName;
                const updated = formatRepoUpdatedAt(repo.updatedAt);
                const meta = [repo.primaryLanguage, updated ? `Updated ${updated}` : null]
                  .filter(Boolean)
                  .join(' · ');
                const busy = importingRepo === repo.fullName;
                return (
                  <li key={repo.id}>
                    <div className="flex flex-col gap-2 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--ds-text)]">
                          {repoName}
                        </p>
                        <p className="truncate text-xs text-[var(--ds-text-muted)]">
                          {repo.fullName}
                        </p>
                        {repo.description ? (
                          <p className="mt-1 line-clamp-2 text-xs text-[var(--ds-text-secondary)]">
                            {repo.description}
                          </p>
                        ) : null}
                        {meta ? (
                          <p className="mt-1 text-[11px] text-[var(--ds-text-muted)]">{meta}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        disabled={importingRepo !== null}
                        onClick={() => onSelectRepo(repo)}
                        className={`${profilePrimaryButtonSmClass} shrink-0 disabled:opacity-50`}
                      >
                        {busy ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Importing…
                          </>
                        ) : (
                          'Use this repository'
                        )}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
