'use client';

import Link from 'next/link';

import type { SkillEvidenceContextView } from '@/lib/skill-evidence-context';
import { linkedProjectItems } from '@/lib/skill-linked-evidence-bundle';
import { profileMutedTextClass } from '@/lib/profile-ui-classes';

const MAX_VISIBLE = 2;

export function AssessmentSkillLinkedProjects({
  context,
}: {
  context: SkillEvidenceContextView | undefined;
}) {
  const projects = linkedProjectItems(context);

  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface-hover)]/50 px-3 py-2">
        <p className={`text-xs font-medium uppercase tracking-wide ${profileMutedTextClass}`}>
          Linked project
        </p>
        <p className={`mt-1 text-sm ${profileMutedTextClass}`}>
          No project linked yet. Tag a project with this skill on your profile.
        </p>
        <Link
          href="/profile?section=projects"
          className="mt-2 inline-block text-xs font-semibold text-[var(--ds-green)] hover:underline"
        >
          Add or link a project →
        </Link>
      </div>
    );
  }

  const visible = projects.slice(0, MAX_VISIBLE);
  const extra = projects.length - visible.length;

  return (
    <div className="rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-hover)]/40 px-3 py-2">
      <p className={`text-xs font-medium uppercase tracking-wide ${profileMutedTextClass}`}>
        Linked project{projects.length === 1 ? '' : 's'}
      </p>
      <ul className="mt-1.5 space-y-1">
        {visible.map((item) => (
          <li
            key={item.evidenceId ?? item.label}
            className="flex items-center justify-between gap-2"
          >
            {item.href ? (
              <Link
                href={item.href}
                className="min-w-0 truncate text-sm font-medium text-[var(--ds-text)] underline-offset-2 hover:text-[var(--ds-green)] hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span className="min-w-0 truncate text-sm font-medium text-[var(--ds-text)]">
                {item.label}
              </span>
            )}
            <span className="shrink-0 text-[10px] capitalize text-[var(--ds-text-muted)]">
              {item.verificationStatus.toLowerCase()}
            </span>
          </li>
        ))}
      </ul>
      {extra > 0 ? (
        <p className={`mt-1 text-xs ${profileMutedTextClass}`}>+{extra} more on your profile</p>
      ) : null}
    </div>
  );
}
