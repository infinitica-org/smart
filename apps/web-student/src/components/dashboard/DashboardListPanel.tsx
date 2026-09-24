'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

export type DashboardBadgeTone = 'danger' | 'warning' | 'neutral' | 'success';

export interface DashboardListItem {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  href?: string;
  badge?: { label: string; tone: DashboardBadgeTone };
}

const BADGE_CLASS: Record<DashboardBadgeTone, string> = {
  danger:
    'border-rose-200/90 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
  warning:
    'border-amber-200/90 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  success:
    'border-emerald-200/90 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  neutral:
    'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
};

function Row({ item }: { item: DashboardListItem }) {
  const body: ReactNode = (
    <>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-200">
          {item.title}
        </p>
        {item.subtitle ? (
          <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">{item.subtitle}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {item.meta ? (
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{item.meta}</span>
        ) : null}
        {item.badge ? (
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${BADGE_CLASS[item.badge.tone]}`}
          >
            {item.badge.label}
          </span>
        ) : null}
      </div>
    </>
  );
  const className =
    'flex items-center justify-between gap-3 rounded-lg border border-zinc-100 bg-zinc-50/70 px-3 py-2.5 transition-colors hover:border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900/60';
  return item.href ? (
    <Link href={item.href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/**
 * A dashboard card with a title, a "view all" link and either rows or an explicit empty state.
 * `total` can exceed `items.length` when the list is capped.
 */
export function DashboardListPanel({
  title,
  testId,
  items,
  total,
  viewAllHref,
  viewAllLabel = 'View all',
  emptyTitle,
  emptyBody,
  loading = false,
}: {
  title: string;
  testId: string;
  items: DashboardListItem[];
  total?: number;
  viewAllHref?: string;
  viewAllLabel?: string;
  emptyTitle: string;
  emptyBody: string;
  /** While true the panel says it is loading rather than claiming there is nothing to show. */
  loading?: boolean;
}) {
  return (
    <section
      data-testid={testId}
      className="flex flex-col rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-[#161616]"
    >
      <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
        <h3 className="font-heading text-base font-bold tracking-tight text-zinc-900 dark:text-white">
          {title}
        </h3>
        {viewAllHref ? (
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-700 hover:underline dark:text-zinc-300"
          >
            {viewAllLabel}
            <ArrowRight className="size-3.5" />
          </Link>
        ) : null}
      </div>

      {loading ? (
        <p className="py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">Loading…</p>
      ) : items.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-xs font-semibold text-zinc-900 dark:text-white">{emptyTitle}</p>
          <p className="mx-auto mt-0.5 max-w-xs text-[11px] text-zinc-500 dark:text-zinc-400">
            {emptyBody}
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {items.map((item) => (
            <Row key={item.id} item={item} />
          ))}
          {total !== undefined && total > items.length ? (
            <p className="pt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              Showing {items.length} of {total}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
