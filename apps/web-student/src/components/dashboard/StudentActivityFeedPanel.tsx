'use client';

import { Eye, FileText, TrendingUp } from 'lucide-react';

export interface ActivityFeedItem {
  id: string;
  icon: 'eye' | 'file' | 'trending';
  text: string;
}

export function StudentActivityFeedPanel({ activities = [] }: { activities?: ActivityFeedItem[] }) {
  return (
    <section className="relative overflow-hidden rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs font-sans select-none dark:border-zinc-800 dark:bg-[#161616]">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-850">
        <div>
          <h2 className="font-heading text-base font-bold tracking-tight text-zinc-900 dark:text-white">
            Recent Activity
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Live placement application events, recruiter views, and verified skill updates
          </p>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-8 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
          <FileText className="mx-auto size-7 text-zinc-400 mb-2" />
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            No activity recorded yet
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Your skill declarations, assessments, and applications will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {activities.map((act) => {
            let Icon = Eye;
            if (act.icon === 'file') Icon = FileText;
            if (act.icon === 'trending') Icon = TrendingUp;

            return (
              <div
                key={act.id}
                className="flex items-center gap-3.5 rounded-lg border border-zinc-100 bg-zinc-50/60 p-3 text-xs text-zinc-700 transition-colors hover:border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-white text-zinc-700 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  <Icon className="size-4 stroke-[1.75]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs text-zinc-800 dark:text-zinc-200 truncate">
                    {act.text}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-zinc-400">Live</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
