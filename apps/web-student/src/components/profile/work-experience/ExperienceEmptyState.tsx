'use client';

import { Briefcase, Plus } from 'lucide-react';

import { profilePrimaryButtonClass } from '@/lib/profile-ui-classes';

interface ExperienceEmptyStateProps {
  onAdd: () => void;
}

export function ExperienceEmptyState({ onAdd }: ExperienceEmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ds-green-soft)] text-[var(--ds-green)]">
        <Briefcase className="h-5 w-5" aria-hidden="true" />
      </span>
      <h4 className="mt-5 text-xl font-semibold text-[var(--ds-text)]">
        Your professional journey starts here
      </h4>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--ds-text-muted)]">
        Add your first work experience and start building evidence-backed professional credibility.
      </p>
      <button type="button" onClick={onAdd} className={`${profilePrimaryButtonClass} mt-6`}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add Work Experience
      </button>
      <p className="mt-8 text-xs leading-relaxed text-[var(--ds-text-muted)]">
        Get verified · Increase visibility · Build credibility · Unlock opportunities
      </p>
    </div>
  );
}
