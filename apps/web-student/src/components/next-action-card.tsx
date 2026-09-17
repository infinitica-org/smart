'use client';

import Link from 'next/link';

import { cn } from '@smart/ui';

import { ArrowRight, GraduationCap, Sparkles } from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

import type { RecommendedAction } from '@/lib/profile-progress';

export interface NextActionCardProps {
  action: RecommendedAction;

  onLater: () => void;

  /** Tighter padding for profile workspace rail. */
  compact?: boolean;
}

function iconForAction(actionId: string): LucideIcon {
  if (actionId.includes('education')) return GraduationCap;

  return Sparkles;
}

export function NextActionCard({ action, onLater, compact = false }: NextActionCardProps) {
  const ActionIcon = iconForAction(action.id);

  return (
    <section
      aria-label="Recommended next step"

      className={cn(
        'flex h-full flex-col rounded-2xl border shadow-[0_1px_3px_rgba(15,23,42,0.04)]',
        compact
          ? 'border-[#E2E8F0] bg-white p-[22px]'
          : 'border-[var(--ds-border)] bg-[var(--ds-surface)] p-6 shadow-[var(--ds-card-shadow)]',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`font-semibold text-[#0F172A] ${compact ? 'text-sm' : 'text-base'}`}>
          Recommended Next Step
        </p>

        <span className="shrink-0 rounded-md bg-[#EAF8F5] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#009B83]">
          HIGH IMPACT
        </span>
      </div>

      <div className={`rounded-[10px] bg-[#F4FBF9] ${compact ? 'mt-3 p-3.5' : 'mt-4 p-4'}`}>
        <div className="flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF8F5]">
            <ActionIcon className="h-4 w-4 text-[#009B83]" aria-hidden="true" />
          </span>

          <div className="min-w-0">
            <h3 className={`font-semibold text-[#0F172A] ${compact ? 'text-sm' : 'text-base'}`}>
              {action.title}
            </h3>

            <p className="mt-1 text-sm leading-relaxed text-[#64748B]">{action.description}</p>
          </div>
        </div>
      </div>

      <div className={`flex flex-col gap-2.5 ${compact ? 'mt-4' : 'mt-5'}`}>
        <Link
          href={action.href}

          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[9px] bg-[#009B83] text-sm font-semibold text-white transition hover:bg-[#087F6A]"
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
