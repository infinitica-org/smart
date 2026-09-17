'use client';

import Link from 'next/link';
import type { SkillEvidenceContext } from '@smart/contracts';
import { summarizeEvidenceContext } from '@/lib/competency-display';
import type { SkillEvidenceContextView } from '@/lib/skill-evidence-context';

export function SkillEvidenceContextPanel({
  context,
  compact = false,
}: {
  context: SkillEvidenceContext | SkillEvidenceContextView | undefined;
  compact?: boolean;
}) {
  const hasEvidence = (context?.availableCount ?? 0) > 0;

  return (
    <section
      className={
        compact
          ? 'rounded-lg border border-border bg-muted/50 p-3 text-sm'
          : 'rounded-xl border border-foreground/20 bg-foreground/5 p-4 text-sm'
      }
      aria-label="Linked profile evidence"
    >
      <p className="font-medium text-foreground">
        {hasEvidence ? 'Linked profile evidence' : 'No linked evidence for this skill'}
      </p>
      <p className="mt-1 leading-relaxed text-muted-foreground">
        {summarizeEvidenceContext(context)}
      </p>
      {hasEvidence && context ? (
        <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
          {context.items.slice(0, 5).map((item, index) => {
            const view = item as SkillEvidenceContextView['items'][number];
            const key = view.evidenceId ?? `${item.evidenceType}-${String(index)}`;
            return (
              <li key={key} className="flex justify-between gap-2">
                {'href' in view && view.href ? (
                  <Link
                    href={view.href}
                    className="min-w-0 truncate font-medium text-foreground underline-offset-2 hover:underline"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="min-w-0 truncate">{item.label}</span>
                )}
                <span className="shrink-0 capitalize">{item.verificationStatus.toLowerCase()}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <Link
          href="/profile"
          className="mt-2 inline-block text-xs font-semibold text-foreground hover:underline"
        >
          Add projects or work experience on your profile
        </Link>
      )}
    </section>
  );
}
