'use client';

import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

interface StudentVerificationBannerProps {
  percent?: number;
  areaStatus?: Record<string, boolean> | null;
}

export function StudentVerificationBanner({
  percent = 33,
  areaStatus = null,
}: StudentVerificationBannerProps) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  const endorsementVerified = Boolean(
    areaStatus?.experience || areaStatus?.professionalLinks || areaStatus?.skills,
  );
  const certificationsVerified = Boolean(areaStatus?.certifications);
  const projectsVerified = Boolean(areaStatus?.projects);

  return (
    <section
      data-testid="student-verification-banner"
      className="rounded-md border border-zinc-200/80 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-[#161616] font-sans select-none"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* Circular SVG Progress Ring */}
          <div className="relative flex shrink-0 items-center justify-center">
            <svg className="size-18 -rotate-90 transform" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r={radius}
                className="stroke-zinc-200 dark:stroke-zinc-800"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="40"
                cy="40"
                r={radius}
                className="stroke-zinc-950 transition-all duration-1000 ease-out dark:stroke-white"
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-sm font-extrabold text-zinc-950 dark:text-white">
                {percent}%
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-950 dark:text-white sm:text-base">
                Your profile is {percent}% verified
              </h2>
              {percent >= 80 ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Ready for placement
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  Verification in progress
                </span>
              )}
            </div>

            {/* Dynamic Status Pills from DB state */}
            <div className="flex flex-wrap items-center gap-2">
              {endorsementVerified ? (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200/90 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <Check className="size-3" strokeWidth={2.5} />
                  Endorsement
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                  Endorsement (pending)
                </span>
              )}

              {certificationsVerified ? (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200/90 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <Check className="size-3" strokeWidth={2.5} />
                  Certifications
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                  Certifications
                </span>
              )}

              {projectsVerified ? (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200/90 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <Check className="size-3" strokeWidth={2.5} />
                  Project defended
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                  Project defended
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="shrink-0">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-2xs transition-all hover:bg-zinc-800 active:scale-[0.99] dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            <span>Finish verification</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
