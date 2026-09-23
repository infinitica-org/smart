'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function ProfileSectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800 lg:flex-row lg:items-center lg:justify-between font-sans select-none">
      <div className="min-w-0 flex-1">
        <h2 className="font-heading text-lg font-bold tracking-tight text-zinc-950 dark:text-white">
          {title}
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function ProfileSectionError({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
      {children}
    </div>
  );
}

export function ProfileBentoEmptyPanel({
  tipIcon: TipIcon,
  tipIconClassName: _tipIconClassName,
  tipTitle,
  tipBody,
  emptyIcon: EmptyIcon,
  emptyTitle,
  emptyBody,
  actions,
}: {
  tipIcon: LucideIcon;
  tipIconClassName: string;
  tipTitle: string;
  tipBody: string;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyBody: string;
  actions: ReactNode;
}) {
  return (
    <div className="w-full overflow-hidden rounded-md border border-zinc-200/80 bg-white shadow-2xs dark:border-zinc-800 dark:bg-[#161616] font-sans select-none">
      <div className="border-b border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-white text-zinc-700 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            <TipIcon className="size-4 stroke-[1.75]" />
          </div>
          <div>
            <p className="font-bold text-xs text-zinc-900 dark:text-white">{tipTitle}</p>
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">{tipBody}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center px-6 py-10 text-center">
        <div className="flex size-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 mb-3 dark:bg-zinc-800 dark:text-zinc-500">
          <EmptyIcon className="size-5 stroke-[1.5]" />
        </div>
        <p className="text-sm font-bold text-zinc-900 dark:text-white">{emptyTitle}</p>
        <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">{emptyBody}</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">{actions}</div>
      </div>
    </div>
  );
}
