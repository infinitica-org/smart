'use client';

import Link from 'next/link';
import { FolderGit2, ArrowRight } from 'lucide-react';

import type { SkillEvidenceContextView } from '@/lib/skill-evidence-context';
import { linkedProjectItems } from '@/lib/skill-linked-evidence-bundle';

const MAX_VISIBLE = 2;

export function AssessmentSkillLinkedProjects({
  context,
}: {
  context: SkillEvidenceContextView | undefined;
}) {
  const projects = linkedProjectItems(context);

  if (projects.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-zinc-200 bg-zinc-50/70 p-3 text-left dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          <FolderGit2 className="size-3.5 text-zinc-400" />
          <span>Linked Project</span>
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          No project tagged yet with this skill claim.
        </p>
        <Link
          href="/profile?section=projects"
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-900 hover:underline dark:text-white"
        >
          Tag project on profile
          <ArrowRight className="size-3" />
        </Link>
      </div>
    );
  }

  const visible = projects.slice(0, MAX_VISIBLE);
  const extra = projects.length - visible.length;

  return (
    <div className="rounded-md border border-zinc-100 bg-zinc-50/80 p-3 text-left dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          <FolderGit2 className="size-3.5 text-zinc-400" />
          <span>Linked Project{projects.length === 1 ? '' : 's'}</span>
        </div>
        {extra > 0 && (
          <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
            +{extra} more
          </span>
        )}
      </div>

      <ul className="mt-2 space-y-1.5">
        {visible.map((item) => (
          <li
            key={item.evidenceId ?? item.label}
            className="flex items-center justify-between gap-2"
          >
            {item.href ? (
              <Link
                href={item.href}
                className="min-w-0 truncate text-xs font-semibold text-zinc-900 hover:text-zinc-600 hover:underline dark:text-zinc-200 dark:hover:text-white"
              >
                {item.label}
              </Link>
            ) : (
              <span className="min-w-0 truncate text-xs font-semibold text-zinc-900 dark:text-zinc-200">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
