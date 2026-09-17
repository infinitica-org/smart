'use client';

import type { ProjectDto } from '@smart/contracts';
import { ExternalLink, GitBranch, Loader2, X } from 'lucide-react';
import { ProjectStatusBadge } from '@/components/profile/projects/ProjectStatusBadge';
import { parseStackTags } from '@/components/profile/projects/project-presenters';
import { ProjectDefenseInterviewDialog } from '@/components/profile/ProjectDefenseInterviewDialog';
import { needsOwnershipInterview, processingStateCopy } from '@/lib/project-submission';

type ProjectDetailModalProps = {
  project: ProjectDto | null;
  loading: boolean;
  onClose: () => void;
};

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]">
        {label}
      </h4>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--ds-text-secondary)]">
        {value}
      </p>
    </div>
  );
}

export function ProjectDetailModal({ project, loading, onClose }: ProjectDetailModalProps) {
  if (!project) return null;

  const copy = processingStateCopy(project);
  const tags = parseStackTags(project.stack);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-detail-title"
        className="max-h-[min(92dvh,880px)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)] shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-[1] flex items-start justify-between gap-3 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-6 py-4">
          <div className="min-w-0">
            <h2 id="project-detail-title" className="text-lg font-semibold text-[var(--ds-text)]">
              {project.title}
            </h2>
            <div className="mt-2">
              <ProjectStatusBadge project={project} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-hover)]"
            aria-label="Close project details"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {loading ? (
          <p className="flex items-center gap-2 px-6 py-8 text-sm text-[var(--ds-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading verification details…
          </p>
        ) : (
          <div className="flex flex-col gap-6 px-6 py-5">
            <section aria-labelledby="project-overview-detail">
              <h3
                id="project-overview-detail"
                className="text-sm font-semibold text-[var(--ds-text)]"
              >
                Project overview
              </h3>
              <div className="mt-4 flex flex-col gap-5">
                <DetailBlock label="Problem" value={project.problem} />
                <DetailBlock label="Approach" value={project.approach} />
              </div>
            </section>

            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]">
                Technology stack
              </h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-hover)] px-2 py-0.5 text-[11px] text-[var(--ds-text-secondary)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <DetailBlock label="Outcome" value={project.outcome} />
            </section>

            <section>
              <h4 className="text-sm font-semibold text-[var(--ds-text)]">Links</h4>
              <div className="mt-2 flex flex-col gap-2 text-sm">
                {project.githubUrl ? (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-[var(--ds-green)] hover:underline"
                  >
                    <GitBranch className="h-4 w-4" />
                    GitHub
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                ) : null}
                {project.liveUrl ? (
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-[var(--ds-green)] hover:underline"
                  >
                    Live demo
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                ) : null}
                {!project.githubUrl && !project.liveUrl ? (
                  <p className="text-xs text-[var(--ds-text-muted)]">No links attached.</p>
                ) : null}
              </div>
            </section>

            {needsOwnershipInterview(project) ? (
              <ProjectDefenseInterviewDialog project={project} />
            ) : null}

            <section className="rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-hover)]/50 p-4">
              <h4 className="text-sm font-semibold text-[var(--ds-text)]">Verification</h4>
              <p className="mt-2 text-sm text-[var(--ds-text-secondary)]">{copy.body}</p>
              {project.report ? (
                <dl className="mt-4 grid gap-2 text-xs text-[var(--ds-text-secondary)]">
                  <div className="flex justify-between gap-4">
                    <dt>Overall score</dt>
                    <dd className="font-medium text-[var(--ds-text)]">
                      {Math.round(project.report.score)}/100
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Relevance</dt>
                    <dd>{Math.round(project.report.relevanceScore)}/100</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Quality</dt>
                    <dd>{Math.round(project.report.qualityScore)}/100</dd>
                  </div>
                  {project.report.explanation ? (
                    <div className="mt-2 border-t border-[var(--ds-border-subtle)] pt-2">
                      <dt className="font-medium text-[var(--ds-text)]">Explanation</dt>
                      <dd className="mt-1 whitespace-pre-line leading-relaxed">
                        {project.report.explanation}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
