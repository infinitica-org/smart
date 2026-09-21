'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Mic } from 'lucide-react';
import type { ProjectDto } from '@smart/contracts';
import { Alert } from '@smart/ui';

import { projectDefenseInterviewHref } from '@/components/profile/ProjectDefenseInterviewDialog';
import { api } from '@/lib/api';
import { pendingProjectOwnershipInterviews } from '@/lib/pending-project-interviews';
import { processingStateCopy } from '@/lib/project-submission';
import {
  profileCardClass,
  profileHeadingClass,
  profileMutedTextClass,
  profilePrimaryButtonClass,
} from '@/lib/profile-ui-classes';

export function StudentProjectInterviewsHub() {
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.projects.listMine();
        if (!cancelled) setProjects(res.projects as ProjectDto[]);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load your projects.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pending = useMemo(() => pendingProjectOwnershipInterviews(projects), [projects]);

  return (
    <div className="min-h-full bg-[var(--ds-canvas)]">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-8 md:py-8">
        <header className="max-w-2xl space-y-2">
          <h1
            className={`text-[28px] font-semibold tracking-tight md:text-[32px] ${profileHeadingClass}`}
          >
            Interview
          </h1>
          <p className={`text-base leading-relaxed ${profileMutedTextClass}`}>
            Complete ownership interviews for projects that finished automated review. Placement
            interviews from employers will appear here when scheduling is available.
          </p>
        </header>

        {error ? (
          <Alert tone="danger" title="Error" className="mt-6">
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <p className={`mt-8 text-sm ${profileMutedTextClass}`} aria-live="polite">
            Loading interviews…
          </p>
        ) : pending.length === 0 ? (
          <div className={`${profileCardClass} mt-8 max-w-lg space-y-3`}>
            <h2 className={`text-lg font-semibold ${profileHeadingClass}`}>
              No project interviews pending
            </h2>
            <p className={`text-sm leading-relaxed ${profileMutedTextClass}`}>
              When a submitted project is ready for a voice ownership interview, it will show up
              here with a link to start.
            </p>
            <Link href="/assessment" className={profilePrimaryButtonClass}>
              Go to Assessment
            </Link>
          </div>
        ) : (
          <section className="mt-8" aria-labelledby="project-interviews-heading">
            <h2
              id="project-interviews-heading"
              className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--ds-text-muted)]"
            >
              Project ownership interviews
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {pending.map((project) => {
                const copy = processingStateCopy(project);
                return (
                  <li key={project.projectId}>
                    <article className={`${profileCardClass} flex h-full flex-col gap-4 !p-5`}>
                      <div className="flex gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ds-green)]/10 text-[var(--ds-green)]">
                          <Mic className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <h3 className={`text-lg font-semibold ${profileHeadingClass}`}>
                            {project.title}
                          </h3>
                          <p className={`mt-1 text-sm ${profileMutedTextClass}`}>{copy.title}</p>
                        </div>
                      </div>
                      <p className={`text-sm leading-relaxed ${profileMutedTextClass}`}>
                        {copy.body}
                      </p>
                      <Link
                        href={projectDefenseInterviewHref(project.projectId)}
                        className={`${profilePrimaryButtonClass} mt-auto w-full justify-center`}
                      >
                        Start interview
                      </Link>
                    </article>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
