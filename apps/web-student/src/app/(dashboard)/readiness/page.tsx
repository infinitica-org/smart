'use client';

import {
  EvidenceCard,
  IdentityCard,
  OpeningReadinessCard,
  ProficiencyCard,
  RecommendationsCard,
  RoleReadinessCard,
  SkillDemonstrationCard,
} from '@/components/readiness/readiness-sections';
import { useStudentReadiness } from '@/lib/use-student-readiness';

export default function ReadinessPage() {
  const { data, isLoading, isError, isFetching, refetch } = useStudentReadiness();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 pt-2 pb-16 font-sans">
      <header>
        <h1 className="font-heading text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl dark:text-white">
          Readiness
        </h1>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          How your identity, evidence and skills stand today. Values that cannot be calculated yet
          say so instead of guessing.
        </p>
      </header>

      {isError ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <span>
            {data
              ? 'Could not refresh your readiness. Showing your last loaded values; nothing was changed.'
              : 'Could not load your readiness. Nothing was changed; try again.'}
          </span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-md border border-rose-300 px-3 py-1.5 font-bold hover:bg-rose-100 dark:border-rose-800 dark:hover:bg-rose-950"
          >
            Retry
          </button>
        </div>
      ) : null}

      {data && isFetching && !isError ? (
        <p role="status" className="text-xs text-zinc-500 dark:text-zinc-400">
          Updating your readiness…
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Loading your readiness…</p>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-5 md:grid-cols-2">
            <IdentityCard identity={data.identity} />
            <EvidenceCard evidence={data.evidence} />
          </div>
          <OpeningReadinessCard openings={data.openingReadiness} />
          <RoleReadinessCard role={data.roleReadiness} />
          <div className="grid gap-5 md:grid-cols-2">
            <ProficiencyCard proficiency={data.proficiency} />
            <SkillDemonstrationCard demonstration={data.skillDemonstration} />
          </div>
          <RecommendationsCard recommendations={data.recommendations} />
        </>
      ) : null}
    </div>
  );
}
