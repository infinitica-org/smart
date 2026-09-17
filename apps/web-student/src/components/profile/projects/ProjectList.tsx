'use client';

import type { ProjectDto } from '@smart/contracts';
import { Plus } from 'lucide-react';
import { ProjectCard } from '@/components/profile/projects/ProjectCard';
import type { StackTagCount } from '@/lib/project-submission';

type ProjectListProps = {
  projects: ProjectDto[];
  topStack: StackTagCount[];
  canSubmit: boolean;
  onView: (project: ProjectDto) => void;
  onAdd: () => void;
};

export function ProjectList({ projects, topStack, canSubmit, onView, onAdd }: ProjectListProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-sm font-semibold text-[var(--ds-text)]">
          Your projects
          <span className="ml-1.5 font-normal text-[var(--ds-text-muted)]">
            ({projects.length})
          </span>
        </h2>
      </div>

      {topStack.length > 0 ? (
        <p className="text-xs text-[var(--ds-text-muted)]">
          <span className="font-medium text-[var(--ds-text-secondary)]">
            Your technology stack ·{' '}
          </span>
          {topStack.map(({ tag, count }, index) => (
            <span key={tag}>
              {index > 0 ? ' · ' : ''}
              {tag}
              {count > 1 ? ` (${count})` : ''}
            </span>
          ))}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard key={project.projectId} project={project} onView={onView} />
        ))}
        {canSubmit ? (
          <button
            type="button"
            onClick={onAdd}
            className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface-hover)]/30 px-4 py-8 text-center transition-colors hover:border-[var(--ds-green)] hover:bg-[var(--ds-green-muted)]/40"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-green)]">
              <Plus className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-sm font-medium text-[var(--ds-text-secondary)]">
              Add another project
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
