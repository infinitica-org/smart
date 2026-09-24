'use client';

import Link from 'next/link';
import { ArrowRight, Briefcase } from 'lucide-react';

export interface MatchItem {
  id: string;
  roleTitle: string;
  companyName: string;
  location: string;
  matchPercentage: number;
  /** The student already has an application for this opening. */
  applied?: boolean;
}

export function StudentTopMatchesPanel({ matches = [] }: { matches?: MatchItem[] }) {
  return (
    <section className="relative overflow-hidden rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs font-sans select-none dark:border-zinc-800 dark:bg-[#161616]">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-850">
        <div>
          <h2 className="font-heading text-base font-bold tracking-tight text-zinc-900 dark:text-white">
            Top Matches for You
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Recommended placement opportunities based on your verified skill claims & target
            preferences
          </p>
        </div>
        <Link
          href="/matches"
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors duration-150 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
        >
          View all matches
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-zinc-200/80 bg-white shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
        {matches.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 mb-3 dark:bg-zinc-800 dark:text-zinc-400">
              <Briefcase className="size-5" />
            </div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
              No active job matches yet
            </p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto dark:text-zinc-400">
              Complete your profile sections and verify skills to automatically get matched with
              hiring partners.
            </p>
            <Link
              href="/matches"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
            >
              Explore Matches
            </Link>
          </div>
        ) : (
          <table className="w-full text-left text-[13px] font-sans">
            <thead>
              <tr className="border-b border-zinc-200/80 bg-zinc-50/70 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400">
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Company & Location</th>
                <th className="px-4 py-3 text-right">Match</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {matches.map((item) => (
                <tr
                  key={item.id}
                  className="transition-colors hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        <Briefcase className="size-4" />
                      </div>
                      <span className="font-semibold text-zinc-900 text-sm dark:text-white">
                        {item.roleTitle}
                      </span>
                      {item.applied ? (
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                          Applied
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    {item.companyName} · {item.location}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 shadow-2xs dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      {item.matchPercentage}% match
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {matches.length > 0 && (
        <div className="mt-3 flex items-center justify-between px-1 text-xs text-zinc-400">
          <span>Showing top {matches.length} matches</span>
          <Link
            href="/matches"
            className="font-semibold text-zinc-900 hover:underline dark:text-white"
          >
            Explore full matches list →
          </Link>
        </div>
      )}
    </section>
  );
}
