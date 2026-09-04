'use client';

import Link from 'next/link';
import { Briefcase, CheckCircle2, Layers, Share2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { queryKeys } from '@smart/api-client';
import type { CandidateApplicationDto } from '@smart/contracts';
import { VerificationBadge, cn, useQuery } from '@smart/ui';
import { api } from '@/lib/api';
import {
  firstNameOf,
  headlineFor,
  initialsOf,
  useCurrentUser,
  useTracks,
} from '@/lib/candidate-identity';
import { claimToBadgeStatus, skillNameForCode } from '@/lib/skill-declarations';
import {
  ATS_PIPELINE_STAGES,
  ATS_STAGE_LABELS,
  pipelineProgressIndex,
  sortApplications,
} from '@/lib/my-applications';

export default function DashboardPage() {
  const { data: user } = useCurrentUser();
  const { data: tracks } = useTracks();
  const { data: applicationsRes } = useQuery({
    queryKey: queryKeys.myApplications(),
    queryFn: () => api.placement.listMyApplications(),
  });
  const { data: claims } = useQuery({
    queryKey: ['me', 'skill-claims'] as const,
    queryFn: () => api.assessment.listSkillClaims(),
  });

  const applications = sortApplications(applicationsRes?.applications ?? []);
  const verifiedCount = (claims ?? []).filter((claim) => claim.status === 'VERIFIED').length;
  const declaredCount = claims?.length ?? 0;
  const firstName = firstNameOf(user?.fullName);
  const initials = initialsOf(user?.fullName);

  return (
    <div className="relative mx-auto w-full max-w-[1400px] pb-16 pt-2">
      <div className="relative space-y-10 z-10">
        {/* Top */}
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-4xl font-medium tracking-tight text-white md:text-[44px]">
              Welcome back{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="text-sm text-white/40">
              Here&apos;s where your candidacy stands right now.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-12 xl:pt-4">
            <Stat icon={Briefcase} value={applications.length} label="Active Apps" />
            <Stat icon={CheckCircle2} value={verifiedCount} label="Verified Skills" />
            <Stat icon={Layers} value={declaredCount} label="Skills Declared" />
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-9">
          {/* Left col */}
          <div className="flex flex-col gap-6 lg:col-span-3">
            <div className="relative flex min-h-[220px] flex-col justify-end overflow-hidden rounded-[28px] bg-gradient-to-br from-[#004c63] to-[#0a0a0a] p-6 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-lg font-semibold text-black">
                  {initials}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-display text-xl font-medium text-white">
                    {user?.fullName ?? ''}
                  </h2>
                  <p className="mt-1 text-[13px] text-white/60">{headlineFor(user, tracks)}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-[28px] bg-[#1a1a1a] p-6">
              <div>
                <h3 className="font-medium text-white">Public profile</h3>
                <p className="mt-1 text-[13px] text-white/40">Shareable preview for employers.</p>
              </div>
              <div className="mt-2 flex items-center gap-3 rounded-[20px] bg-white/5 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-black">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-white">
                    {user?.fullName ?? ''}
                  </p>
                  <p className="text-[11px] text-white/40">
                    {verifiedCount} verified skill{verifiedCount === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <Link
                href="/public-profile"
                className="mt-2 flex items-center justify-center gap-2 rounded-full bg-[#00fad0] px-4 py-3 text-[13px] font-semibold text-black hover:bg-[#7dffe6] transition-colors"
              >
                <Share2 className="h-4 w-4" /> Preview
              </Link>
            </div>
          </div>

          {/* Right col */}
          <div className="flex flex-col gap-6 lg:col-span-6">
            {/* Skills */}
            <div className="rounded-[28px] bg-[#1a1a1a] p-7">
              <div className="mb-6 flex items-start justify-between">
                <h3 className="text-lg font-medium text-white">Your skills</h3>
                <Link href="/profile" className="text-[13px] text-[#00fad0] hover:underline">
                  Manage
                </Link>
              </div>
              {!claims ? (
                <p className="text-sm text-white/40">Loading…</p>
              ) : claims.length === 0 ? (
                <p className="text-sm text-white/40">
                  No skills declared yet — add some from your profile.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {claims.slice(0, 8).map((claim) => (
                    <span
                      key={claim.claimId}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-white/80"
                    >
                      <span className="font-medium">{skillNameForCode(claim.skillCode)}</span>
                      <VerificationBadge status={claimToBadgeStatus(claim)} variant="outline" />
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Application Tracker */}
            <div className="rounded-[28px] bg-[#1a1a1a] p-7">
              <div className="mb-8 flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Application tracker</h3>
                <Link href="/applications" className="text-[13px] text-[#00fad0] hover:underline">
                  View all
                </Link>
              </div>
              {applications.length === 0 ? (
                <p className="text-sm text-white/40">
                  No applications yet. Once a TPO shortlists you, it&apos;ll show up here.
                </p>
              ) : (
                <div className="flex flex-col gap-8">
                  {applications.slice(0, 2).map((app) => (
                    <ApplicationRow key={app.applicationId} app={app} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <div className="flex items-center gap-4">
      <Icon className="h-5 w-5 text-white/40" />
      <div className="flex flex-col">
        <span className="text-[40px] leading-none font-light tabular-nums text-white">{value}</span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">
          {label}
        </span>
      </div>
    </div>
  );
}

function ApplicationRow({ app }: { app: CandidateApplicationDto }) {
  const stageIndex = pipelineProgressIndex(app.stage);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[15px] font-medium text-white">{app.roleTitle}</p>
          <p className="mt-0.5 text-[12px] text-white/40">{app.companyName}</p>
        </div>
        <span className="text-[11px] font-medium uppercase tracking-wider text-[#00fad0]">
          {ATS_STAGE_LABELS[app.stage]}
        </span>
      </div>
      <div className="flex h-1.5 gap-1.5">
        {ATS_PIPELINE_STAGES.map((stage, i) => (
          <div
            key={stage}
            className={cn('flex-1 rounded-full', i <= stageIndex ? 'bg-[#00fad0]' : 'bg-white/10')}
          />
        ))}
      </div>
    </div>
  );
}
