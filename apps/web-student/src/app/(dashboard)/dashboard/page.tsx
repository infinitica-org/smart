'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Layers } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { VerificationBadge, useQuery } from '@smart/ui';
import { api } from '@/lib/api';
import {
  firstNameOf,
  headlineFor,
  initialsOf,
  useCurrentUser,
  useTracks,
} from '@/lib/candidate-identity';
import { claimToBadgeStatus, skillNameForCode } from '@/lib/skill-declarations';
import { ProductTour } from '@/components/tour/ProductTour';
import { DASHBOARD_TOUR_STEPS } from '@/lib/tour-steps';
import { consumeTourAutostart } from '@/lib/tour';

export default function DashboardPage() {
  const { data: user } = useCurrentUser();
  const { data: tracks } = useTracks();
  const { data: claims } = useQuery({
    queryKey: ['me', 'skill-claims'] as const,
    queryFn: () => api.assessment.listSkillClaims(),
  });
  // Lazy init — a one-shot read that clears the flag, so it must run exactly once per mount.
  const [autoStartTour] = useState(consumeTourAutostart);

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
            <Stat icon={CheckCircle2} value={verifiedCount} label="Verified Skills" />
            <Stat icon={Layers} value={declaredCount} label="Skills Declared" />
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Candidate Profile Hero */}
          <div className="lg:col-span-1">
            <div
              data-tour="candidate-card"
              className="relative flex min-h-[220px] flex-col justify-end overflow-hidden rounded-[28px] bg-gradient-to-br from-[#004c63] to-[#0a0a0a] p-6 shadow-2xl"
            >
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
          </div>

          {/* Skills Section */}
          <div className="lg:col-span-2">
            <div data-tour="skills-panel" className="rounded-[28px] bg-[#1a1a1a] p-7">
              <div className="mb-6 flex items-start justify-between">
                <h3 className="text-lg font-medium text-white">Your skills</h3>
                <Link
                  href="/skills"
                  data-tour="manage-skills-link"
                  className="text-[13px] text-[#00fad0] hover:underline"
                >
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
                  {claims.slice(0, 12).map((claim) => (
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
          </div>
        </div>
      </div>
      <ProductTour steps={DASHBOARD_TOUR_STEPS} autoStart={autoStartTour} />
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
