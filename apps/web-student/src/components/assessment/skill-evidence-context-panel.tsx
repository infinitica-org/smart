'use client';

import Link from 'next/link';
import type { SkillEvidenceContext } from '@smart/contracts';
import { summarizeEvidenceContext } from '@/lib/competency-display';

export function SkillEvidenceContextPanel({
  context,
  compact = false,
}: {
  context: SkillEvidenceContext | undefined;
  compact?: boolean;
}) {
  const hasEvidence = (context?.availableCount ?? 0) > 0;

  return (
    <section
      className={
        compact
          ? 'rounded-lg border border-border bg-muted/50 p-3 text-sm'
          : 'rounded-xl border border-[#00fad0]/20 bg-[#00fad0]/5 p-4 text-sm'
      }
      aria-label="Application evidence context"
    >
      <p className="font-medium text-foreground">
        {hasEvidence ? 'Application evidence on file' : 'No application evidence yet'}
      </p>
      <p className="mt-1 leading-relaxed text-muted-foreground">
        {summarizeEvidenceContext(context)}
      </p>
      {hasEvidence && context ? (
        <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
          {context.items.slice(0, 5).map((item) => (
            <li key={`${item.evidenceType}-${item.label}`} className="flex justify-between gap-2">
              <span>{item.label}</span>
              <span className="shrink-0 capitalize">{item.verificationStatus.toLowerCase()}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Link
          href="/profile"
          className="mt-2 inline-block text-xs font-semibold text-[#00967c] hover:underline"
        >
          Add projects or work experience on your profile
        </Link>
      )}
    </section>
  );
}
