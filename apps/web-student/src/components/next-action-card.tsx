'use client';

import Link from 'next/link';

import { ArrowRight, GraduationCap, Sparkles } from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

import type { RecommendedAction } from '@/lib/profile-progress';

export interface NextActionCardProps {
  action: RecommendedAction;

  onLater: () => void;
}

function iconForAction(actionId: string): LucideIcon {
  if (actionId.includes('education')) return GraduationCap;

  return Sparkles;
}

export function NextActionCard({ action, onLater }: NextActionCardProps) {
  const ActionIcon = iconForAction(action.id);

  return (
    <section
      aria-label="Recommended next step"

      className="flex h-full flex-col rounded-[14px] border border-[var(--ds-border)] bg-[var(--ds-surface)] p-6 shadow-[var(--ds-card-shadow)]"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-base font-semibold text-[var(--ds-text)]">Recommended Next Step</p>

        <span className="shrink-0 rounded-md bg-[var(--ds-green-soft)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ds-green)]">
          HIGH IMPACT
        </span>
      </div>

      <div className="mt-4 rounded-[10px] bg-[var(--ds-green-muted)] p-4">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--ds-green-soft)]">
            <ActionIcon className="h-5 w-5 text-[var(--ds-green)]" aria-hidden="true" />
          </span>

          <div className="min-w-0">
            <h3 className="text-base font-semibold text-[var(--ds-text)]">{action.title}</h3>

            <p className="mt-1 text-sm leading-relaxed text-[var(--ds-text-muted)]">
              {action.description}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <Link
          href={action.href}

          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[9px] bg-[var(--ds-green)] text-sm font-semibold text-white transition hover:bg-[var(--ds-green-hover)]"
        >
          {action.ctaLabel}

          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>

        <button
          type="button"

          onClick={onLater}

          className="text-left text-sm text-[var(--ds-link)] underline-offset-2 transition hover:underline"
        >
          Not now? Remind me later
        </button>
      </div>
    </section>
  );
}
