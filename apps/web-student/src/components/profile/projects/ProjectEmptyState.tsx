'use client';

import { FolderKanban, GitBranch, Plus } from 'lucide-react';
import { profilePrimaryButtonClass, profileSecondaryButtonSmClass } from '@/lib/profile-ui-classes';

type ProjectEmptyStateProps = {
  canSubmit: boolean;
  onAdd: () => void;
  onImportGithub: () => void;
};

export function ProjectEmptyState({ canSubmit, onAdd, onImportGithub }: ProjectEmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ds-green-soft)] text-[var(--ds-green)]">
        <FolderKanban className="h-5 w-5" aria-hidden="true" />
      </span>
      <h4 className="mt-5 text-xl font-semibold text-[var(--ds-text)]">
        Your projects tell your story
      </h4>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--ds-text-muted)]">
        Show what you&apos;ve built, how you solved problems, and the technologies you used.
        Verified projects strengthen your public profile.
      </p>
      {canSubmit ? (
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <button type="button" onClick={onAdd} className={profilePrimaryButtonClass}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add your first project
          </button>
          <button type="button" onClick={onImportGithub} className={profileSecondaryButtonSmClass}>
            <GitBranch className="h-4 w-4" aria-hidden="true" />
            Import from GitHub
          </button>
        </div>
      ) : null}
      <p className="mt-8 text-xs leading-relaxed text-[var(--ds-text-muted)]">
        Get verified · Increase visibility · Unlock opportunities
      </p>
    </div>
  );
}
