'use client';

import Link from 'next/link';
import { Briefcase, Share2 } from 'lucide-react';
import { queryKeys } from '@smart/api-client';
import type { SkillClaimDto } from '@smart/contracts';
import { cn, useQuery } from '@smart/ui';
import { ApplicationStageTimeline } from '@/components/applications/ApplicationStageTimeline';
import { api } from '@/lib/api';
import { ATS_STAGE_LABELS, sortApplications } from '@/lib/my-applications';
import { claimStatusLabel, claimToBadgeStatus, skillNameForCode } from '@/lib/skill-declarations';
import {
  givenNameFromFullName,
  initialsFromFullName,
  profileSubtitle,
  trackDisplayName,
} from '@/lib/student-identity';

const SKILL_CLAIMS_QUERY_KEY = ['assessment', 'skill-claims'] as const;

function skillChipClass(badge: string): string {
  if (badge === 'VERIFIED') return 'border-[#00fad0]/30 bg-[#00fad0]/10 text-[#00fad0]';
  if (badge === 'IN_VERIFICATION') return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
  if (badge === 'LOCKED') return 'border-red-500/30 bg-red-500/10 text-red-400';
  return 'border-white/10 bg-white/5 text-white/60';
}

function UnavailablePanel({
  title,
  body,
  className,
}: {
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col justify-between rounded-[28px] bg-[#1a1a1a] p-7', className)}>
      <h3 className="text-lg font-medium text-white">{title}</h3>
      <p className="mt-4 text-sm leading-relaxed text-white/40">{body}</p>
    </div>
  );
}

export default function DashboardPage() {
  const meQuery = useQuery({
    queryKey: queryKeys.me(),
    queryFn: () => api.auth.me(),
  });
  const onboardingQuery = useQuery({
    queryKey: ['me', 'onboarding'],
    queryFn: () => api.users.getOnboarding(),
  });
  const claimsQuery = useQuery({
    queryKey: SKILL_CLAIMS_QUERY_KEY,
    queryFn: () => api.assessment.listSkillClaims(),
  });
  const applicationsQuery = useQuery({
    queryKey: queryKeys.myApplications(),
    queryFn: () => api.placement.listMyApplications(),
  });

  const me = meQuery.data;
  const fullName = me?.fullName?.trim() || 'Student';
  const firstName = givenNameFromFullName(fullName);
  const profile = onboardingQuery.data?.profile;
  const latestExperience = profile?.experiences[0];
  const subtitle = me
    ? profileSubtitle({
        institutionName: me.institutionName,
        primaryTrack: me.primaryTrack,
        latestRole: latestExperience?.role,
        latestCompany: latestExperience?.company,
      })
    : null;
  const claims = claimsQuery.data ?? [];
  const verifiedCount = claims.filter((claim) => claim.status === 'VERIFIED').length;
  const applications = sortApplications(applicationsQuery.data?.applications ?? []).slice(0, 2);

  return (
    <div className="relative mx-auto w-full max-w-[1400px] pb-16 pt-2">
      <div className="relative z-10 space-y-10">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex flex-col gap-3">
            <h1 className="font-display text-4xl font-medium tracking-tight text-white md:text-[44px]">
              Welcome back, {meQuery.isLoading ? '…' : firstName}
            </h1>
            {me?.primaryTrack ? (
              <p className="text-sm text-white/40">{trackDisplayName(me.primaryTrack)}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-end gap-12 xl:pt-4">
            <div className="flex items-center gap-4">
              <Briefcase className="h-5 w-5 text-white/40" />
              <div className="flex flex-col">
                <span className="text-[40px] leading-none font-light text-white tabular-nums">
                  {applicationsQuery.isLoading ? '—' : applicationsQuery.data?.applications.length}
                </span>
                <span className="mt-1 text-[10px] font-medium tracking-[0.2em] text-white/40 uppercase">
                  Applications
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-3">
            <div className="relative flex h-[380px] flex-col justify-end overflow-hidden rounded-[28px] bg-[#1a1a1a] p-6">
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/40 to-transparent" />
              <div className="relative flex items-end justify-between">
                <div>
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-lg font-semibold text-black">
                    {initialsFromFullName(fullName)}
                  </div>
                  <h2 className="font-display text-2xl font-medium text-white">{fullName}</h2>
                  {subtitle ? <p className="mt-1 text-[13px] text-white/60">{subtitle}</p> : null}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-[28px] bg-[#1a1a1a] p-6">
              <div>
                <h3 className="font-medium text-white">Public profile</h3>
                <p className="mt-1 text-[13px] text-white/40">
                  Preview only. There is no public-profile contract yet.
                </p>
              </div>
              <div className="mt-2 flex items-center gap-3 rounded-[20px] bg-white/5 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-black">
                  {initialsFromFullName(fullName)}
                </div>
                <div>
                  <p className="text-[13px] font-medium text-white">{fullName}</p>
                  <p className="text-[11px] text-white/40">
                    {verifiedCount} verified {verifiedCount === 1 ? 'skill' : 'skills'}
                  </p>
                </div>
              </div>
              <Link
                href="/public-profile"
                className="mt-2 flex items-center justify-center gap-2 rounded-full bg-[#00fad0] px-4 py-3 text-[13px] font-semibold text-black transition-colors hover:bg-[#7dffe6]"
              >
                <Share2 className="h-4 w-4" /> Preview
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:col-span-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <UnavailablePanel
                className="h-[380px]"
                title="Weekly activity"
                body="Time-on-platform charts are not available. SMART has no student activity-hours contract."
              />

              <div className="flex h-[380px] flex-col rounded-[28px] bg-[#1a1a1a] p-7">
                <div className="mb-6 flex items-start justify-between">
                  <h3 className="text-lg font-medium text-white">Skills</h3>
                  <Link href="/profile" className="text-[13px] text-[#00fad0] hover:underline">
                    Manage
                  </Link>
                </div>
                {claimsQuery.isLoading ? (
                  <p className="text-sm text-white/40">Loading skills…</p>
                ) : claims.length === 0 ? (
                  <p className="text-sm text-white/40">No skills declared yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 overflow-y-auto">
                    {claims.map((claim: SkillClaimDto) => {
                      const badge = claimToBadgeStatus(claim);
                      return (
                        <span
                          key={claim.claimId}
                          className={cn(
                            'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[13px]',
                            skillChipClass(badge),
                          )}
                        >
                          <span className="font-medium">{skillNameForCode(claim.skillCode)}</span>
                          <span className="text-[11px] opacity-70">{claimStatusLabel(badge)}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[28px] bg-[#1a1a1a] p-7">
              <div className="mb-8 flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Application tracker</h3>
                <Link href="/applications" className="text-[13px] text-[#00fad0] hover:underline">
                  View all
                </Link>
              </div>
              {applicationsQuery.isLoading ? (
                <p className="text-sm text-white/40">Loading applications…</p>
              ) : applications.length === 0 ? (
                <p className="text-sm text-white/40">No applications yet.</p>
              ) : (
                <div className="flex flex-col gap-8">
                  {applications.map((row) => (
                    <div key={row.applicationId} className="flex flex-col gap-3">
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[15px] font-medium text-white">{row.roleTitle}</p>
                          <p className="mt-0.5 text-[12px] text-white/40">{row.companyName}</p>
                        </div>
                        <span className="text-[11px] font-medium tracking-wider text-[#00fad0] uppercase">
                          {ATS_STAGE_LABELS[row.stage]}
                        </span>
                      </div>
                      <ApplicationStageTimeline stage={row.stage} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:col-span-3">
            <div className="flex h-[180px] flex-col justify-between rounded-[28px] bg-[#1a1a1a] p-7">
              <h3 className="text-lg font-medium text-white">Onboarding</h3>
              <p className="text-sm text-white/45">
                {me?.onboardingCompleted
                  ? 'Completed. Mandatory profile onboarding is done.'
                  : 'Incomplete.'}
              </p>
            </div>

            <UnavailablePanel
              className="flex-1"
              title="Interviews"
              body="Scheduled interview lists are not available. There is no student interview calendar contract."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
