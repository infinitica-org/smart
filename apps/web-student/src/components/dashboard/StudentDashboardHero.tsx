'use client';

import Link from 'next/link';
import { Calendar, Sparkles, UserPlus } from 'lucide-react';

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  return 'Good evening,';
}

type StudentDashboardHeroProps = {
  displayName?: string | null;
  loading?: boolean;
};

export function StudentDashboardHero({
  displayName = 'Allen',
  loading = false,
}: StudentDashboardHeroProps) {
  const currentHour = new Date().getHours();
  const greeting = greetingForHour(currentHour);
  const formattedDate = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <section className="relative -mx-4 -mt-6 overflow-hidden border-b border-zinc-100/80 px-4 py-10 text-center md:-mx-8 md:-mt-8 md:px-6 md:py-12 select-none font-sans">
      {/* Ambient Mesh Gradient matching TPO Screenshot */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 60% 80% at 10% 20%, rgba(167, 243, 208, 0.55) 0%, rgba(204, 251, 241, 0.35) 40%, transparent 75%),
            radial-gradient(ellipse 55% 75% at 90% 20%, rgba(217, 249, 157, 0.55) 0%, rgba(254, 240, 138, 0.3) 40%, transparent 75%),
            radial-gradient(ellipse 50% 50% at 50% 10%, rgba(255, 255, 255, 0.8) 0%, transparent 70%),
            linear-gradient(180deg, rgba(240, 253, 244, 0.3) 0%, rgba(255, 255, 255) 100%)
          `,
        }}
      />

      <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50/80 px-3 py-1 text-xs font-semibold text-emerald-900 mb-3 shadow-2xs">
        <Sparkles className="size-3 text-emerald-600" />
        <span>{greeting}</span>
      </div>

      {loading ? (
        <div className="mx-auto mt-2 h-11 w-72 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      ) : (
        <h1 className="font-heading mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-zinc-950 md:text-4xl dark:text-white">
          {displayName}
        </h1>
      )}

      <p className="mx-auto mt-2.5 max-w-lg text-xs leading-relaxed text-zinc-600 md:text-sm dark:text-zinc-400">
        Connect verified campus talent directly with hiring employers and track placement drive
        progress.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-md border border-zinc-200/80 bg-white/80 px-3 py-1 text-xs font-medium text-zinc-600 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          <Calendar className="size-3.5 text-zinc-500" strokeWidth={1.5} />
          {formattedDate}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-3">
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition-all hover:bg-zinc-800 hover:scale-[1.01] active:scale-[0.99] dark:bg-white dark:text-zinc-900"
        >
          <UserPlus className="size-3.5" />
          Finish Verification
        </Link>
      </div>
    </section>
  );
}
