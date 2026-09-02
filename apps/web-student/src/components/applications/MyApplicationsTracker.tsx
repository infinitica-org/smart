'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Briefcase, MapPin } from 'lucide-react';
import { queryKeys } from '@smart/api-client';
import type { CandidateApplicationDto } from '@smart/contracts';
import { cn, useQuery } from '@smart/ui';
import { api } from '../../lib/api';
import {
  ATS_STAGE_LABELS,
  MY_APPLICATIONS_POLL_MS,
  formatAppliedOn,
  matchPercent,
  sortApplications,
} from '../../lib/my-applications';
import { ApplicationStageTimeline } from './ApplicationStageTimeline';

export function MyApplicationsTracker({
  pollIntervalMs = MY_APPLICATIONS_POLL_MS,
}: {
  pollIntervalMs?: number;
}) {
  const { data, isLoading, isFetching, isError, refetch, dataUpdatedAt } = useQuery({
    queryKey: queryKeys.myApplications(),
    queryFn: () => api.placement.listMyApplications(),
    refetchInterval: pollIntervalMs,
  });

  const applications = useMemo(
    () => sortApplications(data?.applications ?? []),
    [data?.applications],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    applications.find((row) => row.applicationId === selectedId) ?? applications[0] ?? null;

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-16">
        <Header updating={false} />
        <p className="text-sm text-white/40" role="status">
          Loading your applications…
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-16">
        <Header updating={false} />
        <div
          className="rounded-[28px] border border-rose-500/30 bg-[#141414] px-6 py-8"
          role="alert"
        >
          <p className="text-sm text-white/80">Could not load your applications.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-4 rounded-full bg-[#00FAD0] px-5 py-2.5 text-sm font-semibold text-[#131313]"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="mx-auto max-w-3xl rounded-[32px] border border-dashed border-white/15 px-8 py-16 text-center">
        <h1 className="font-display text-3xl text-white">No applications yet</h1>
        <p className="mt-2 text-sm text-white/40">
          When a TPO shortlists you for an opening, the ATS timeline appears here.
        </p>
        <Link
          href="/profile"
          className="mt-6 inline-flex rounded-full bg-[#00FAD0] px-5 py-2.5 text-sm font-semibold text-[#131313]"
        >
          Continue profile
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-16">
      <Header updating={isFetching && !isLoading} updatedAt={dataUpdatedAt} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-4">
          {applications.map((app) => (
            <ApplicationCard
              key={app.applicationId}
              app={app}
              active={app.applicationId === selected.applicationId}
              onSelect={() => setSelectedId(app.applicationId)}
            />
          ))}
        </div>

        <ApplicationDetail app={selected} />
      </div>
    </div>
  );
}

function Header({ updating, updatedAt }: { updating: boolean; updatedAt?: number }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-4xl font-medium tracking-tight text-white">
          My Applications
        </h1>
        <p className="mt-2 text-sm text-white/40">
          Status mirrors the company ATS. Updates arrive on a short poll — no refresh needed.
        </p>
      </div>
      <p className="text-[11px] tracking-wide text-white/35 uppercase" aria-live="polite">
        {updating
          ? 'Updating…'
          : updatedAt
            ? `Live · ${new Date(updatedAt).toLocaleTimeString()}`
            : 'Live'}
      </p>
    </div>
  );
}

function ApplicationCard({
  app,
  active,
  onSelect,
}: {
  app: CandidateApplicationDto;
  active: boolean;
  onSelect: () => void;
}) {
  const score = matchPercent(app.matchScore);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-[28px] border p-4 text-left transition',
        active
          ? 'border-[#00FAD0]/35 bg-[#1a1a1a]'
          : 'border-white/10 bg-[#141414] hover:border-white/20',
      )}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
            active ? 'bg-[#00FAD0]/15 text-[#00FAD0]' : 'bg-white/5 text-white/35',
          )}
        >
          <Briefcase className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{app.roleTitle}</p>
          <p className="mt-0.5 text-xs text-white/35">{app.companyName}</p>
        </div>
        {score ? <span className="text-xs font-semibold text-[#00FAD0]">{score}</span> : null}
      </div>
      <div className="mt-3">
        <ApplicationStageTimeline stage={app.stage} labels={false} />
      </div>
      <p className="mt-2 text-[11px] text-white/30">{ATS_STAGE_LABELS[app.stage]}</p>
    </button>
  );
}

function ApplicationDetail({ app }: { app: CandidateApplicationDto }) {
  const score = matchPercent(app.matchScore);
  return (
    <div className="rounded-[32px] border border-white/10 bg-[#141414] p-7 lg:col-span-8 md:p-9">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#F4F4F4] px-3 py-1 text-[11px] font-semibold text-[#131313]">
          {app.companyName}
        </span>
        {app.location ? (
          <span className="inline-flex items-center gap-1 text-xs text-white/35">
            <MapPin className="h-3.5 w-3.5" /> {app.location}
          </span>
        ) : null}
        <span className="text-xs text-white/25">Applied {formatAppliedOn(app.createdAt)}</span>
      </div>
      <h2 className="mt-5 font-display text-3xl font-medium text-white md:text-4xl">
        {app.roleTitle}
      </h2>
      <p className="mt-3 text-sm text-white/40">
        Current status:{' '}
        <span className="font-semibold text-[#00FAD0]">{ATS_STAGE_LABELS[app.stage]}</span>
      </p>

      <div className="mt-10">
        <p className="mb-3 text-[11px] font-semibold tracking-wider text-white/35 uppercase">
          ATS status
        </p>
        <ApplicationStageTimeline stage={app.stage} />
      </div>

      {score ? (
        <div className="mt-10 rounded-[24px] bg-black/30 p-5">
          <p className="text-[11px] font-semibold tracking-wider text-[#00FAD0] uppercase">
            Match score
          </p>
          <p className="mt-2 text-sm text-white/65">Ranked match {score} against this opening.</p>
        </div>
      ) : null}
    </div>
  );
}
