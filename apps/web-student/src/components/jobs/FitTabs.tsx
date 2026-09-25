'use client';

import { JOB_FIT_TABS, type JobFitTab, type StudentJobCounts } from '@smart/contracts';
import { FIT_TAB_LABELS } from '@/lib/jobs-url-state';

interface FitTabsProps {
  value: JobFitTab;
  counts: StudentJobCounts | undefined;
  onChange: (tab: JobFitTab) => void;
}

const COUNT_KEY: Record<JobFitTab, keyof StudentJobCounts> = {
  STRONG: 'strong',
  GOOD: 'good',
  ALL: 'all',
};

/** Strong fit / Good fit / All. Counts and bands come from the server; nothing is recomputed here. */
export function FitTabs({ value, counts, onChange }: FitTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Fit"
      className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800"
    >
      {JOB_FIT_TABS.map((tab) => {
        const active = tab === value;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${
              active
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {FIT_TAB_LABELS[tab]}
            {counts ? (
              <span className="ml-1.5 rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">
                {counts[COUNT_KEY[tab]]}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
