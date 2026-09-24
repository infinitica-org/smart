'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import type { DashboardNextAction } from '@smart/contracts';

/** The single recommended next step, or a completion message when there is nothing left to do. */
export function StudentNextActionCard({ action }: { action: DashboardNextAction | null }) {
  if (!action) {
    return (
      <section
        data-testid="next-action-card"
        className="flex items-center gap-3 rounded-md border border-emerald-200/80 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30"
      >
        <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
        <div>
          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
            Your profile is complete
          </p>
          <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
            There is no recommended action right now.
          </p>
        </div>
      </section>
    );
  }
  return (
    <section
      data-testid="next-action-card"
      className="flex flex-col gap-3 rounded-md border border-zinc-200/80 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-[#161616]"
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Next recommended action
        </p>
        <p className="mt-0.5 text-sm font-bold text-zinc-950 dark:text-white">{action.title}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{action.description}</p>
      </div>
      <Link
        href={action.href}
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
      >
        {action.ctaLabel}
        <ArrowRight className="size-3.5" />
      </Link>
    </section>
  );
}
