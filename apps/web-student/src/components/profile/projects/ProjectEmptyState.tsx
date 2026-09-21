'use client';

import { FolderKanban, GitBranch, Plus, Sparkles } from 'lucide-react';

import { ProfileBentoEmptyPanel } from '@/components/profile/ProfileSectionChrome';
import {
  profilePrimaryButtonSmClass,
  profileSecondaryButtonSmClass,
} from '@/lib/profile-ui-classes';

type ProjectEmptyStateProps = {
  canSubmit: boolean;
  onAdd: () => void;
  onImportGithub: () => void;
};

export function ProjectEmptyState({ canSubmit, onAdd, onImportGithub }: ProjectEmptyStateProps) {
  if (!canSubmit) {
    return (
      <div className="overflow-hidden rounded-[18px] border border-[var(--ds-border)] bg-[var(--ds-surface)] px-5 py-8 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <p className="text-[15px] font-semibold text-[var(--ds-text)]">Project verification</p>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--ds-text-muted)]">
          Project verification isn&apos;t on your institution&apos;s plan. Ask your TPO to upgrade
          to submit verified projects.
        </p>
      </div>
    );
  }

  return (
    <ProfileBentoEmptyPanel
      tipIcon={Sparkles}
      tipIconClassName="text-[#7c3aed]"
      tipTitle="Show what you've built"
      tipBody="Verified projects highlight problem-solving, stack, and outcomes on your public profile."
      emptyIcon={FolderKanban}
      emptyTitle="No projects yet"
      emptyBody="Add manually or import from GitHub — we'll guide you through evidence and verification."
      actions={
        <>
          <button
            type="button"
            onClick={onAdd}
            className={`${profilePrimaryButtonSmClass} justify-center px-5 py-2.5 text-[13px]`}
          >
            <Plus className="size-4" strokeWidth={2} aria-hidden />
            Add your first project
          </button>
          <button
            type="button"
            onClick={onImportGithub}
            className={`${profileSecondaryButtonSmClass} justify-center px-5 py-2.5 text-[13px]`}
          >
            <GitBranch className="size-4" strokeWidth={2} aria-hidden />
            Import from GitHub
          </button>
        </>
      }
    />
  );
}
