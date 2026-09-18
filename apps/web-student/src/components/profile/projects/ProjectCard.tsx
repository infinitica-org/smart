'use client';

import type { ProjectDto } from '@smart/contracts';
import { ExternalLink, GitBranch, MoreVertical } from 'lucide-react';
import { ProjectStatusBadge } from '@/components/profile/projects/ProjectStatusBadge';
import {
  parseStackTags,
  projectSummaryText,
} from '@/components/profile/projects/project-presenters';
import { ProjectDefenseInterviewDialog } from '@/components/profile/ProjectDefenseInterviewDialog';
import { needsOwnershipInterview, processingStateCopy } from '@/lib/project-submission';

type ProjectCardProps = {
  project: ProjectDto;
  onView: (project: ProjectDto) => void;
};

export function ProjectCard({ project, onView }: ProjectCardProps) {
  const tags = parseStackTags(project.stack);
  const visibleTags = tags.slice(0, 4);
  const hiddenCount = Math.max(0, tags.length - visibleTags.length);
  const summary = projectSummaryText(project);
  const statusCopy = processingStateCopy(project);

  return (
    <article className="flex h-full flex-col rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-5 shadow-[var(--ds-card-shadow)] transition-shadow duration-150 hover:shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-snug text-[var(--ds-text)]">
            {project.title}
          </h3>
          <div className="mt-2">
            <ProjectStatusBadge project={project} />
          </div>
        </div>
        <button
          type="button"
          className="rounded-lg p-1.5 text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-hover)]"
          aria-label={`More actions for ${project.title}`}
          onClick={() => onView(project)}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </header>

      {summary ? (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[var(--ds-text-secondary)]">
          {summary}
        </p>
      ) : null}

      {visibleTags.length > 0 ? (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]">
            Stack
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-hover)] px-2 py-0.5 text-[11px] text-[var(--ds-text-secondary)]"
              >
                {tag}
              </span>
            ))}
            {hiddenCount > 0 ? (
              <span className="rounded-md border border-dashed border-[var(--ds-border)] px-2 py-0.5 text-[11px] text-[var(--ds-text-muted)]">
                +{hiddenCount}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-medium text-[var(--ds-green)]">
        {project.githubUrl ? (
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:underline"
          >
            <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
            GitHub
            <ExternalLink className="h-3 w-3 opacity-70" aria-hidden="true" />
          </a>
        ) : null}
        {project.liveUrl ? (
          <a
            href={project.liveUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:underline"
          >
            Live Demo
            <ExternalLink className="h-3 w-3 opacity-70" aria-hidden="true" />
          </a>
        ) : null}
      </div>

      {project.status === 'VERIFIED' && project.report ? (
        <div className="mt-4 border-t border-[var(--ds-border-subtle)] pt-3 text-xs text-[var(--ds-text-secondary)]">
          <p className="font-semibold text-[var(--ds-text)]">SMART verification</p>
          <p className="mt-1">
            Score {Math.round(project.report.score)}/100 · {statusCopy.body}
          </p>
        </div>
      ) : project.status === 'UNDER_REVIEW' ? (
        <p className="mt-4 text-xs text-[var(--ds-text-muted)]">{statusCopy.body}</p>
      ) : needsOwnershipInterview(project) ? (
        <p className="mt-4 text-xs text-[var(--ds-text-muted)]">{statusCopy.body}</p>
      ) : null}

      {needsOwnershipInterview(project) ? (
        <div className="mt-3">
          <ProjectDefenseInterviewDialog project={project} />
        </div>
      ) : null}

      <footer className="mt-auto flex justify-end pt-4">
        <button
          type="button"
          onClick={() => onView(project)}
          className="text-sm font-semibold text-[var(--ds-green)] hover:underline"
        >
          View project →
        </button>
      </footer>
    </article>
  );
}
