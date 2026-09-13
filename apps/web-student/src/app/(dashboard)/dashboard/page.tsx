'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { VerificationBadge, useQuery } from '@smart/ui';
import { api } from '@/lib/api';
import { CandidateAvatar } from '@/components/profile/CandidateAvatar';
import { firstNameOf, headlineFor, useCurrentUser, useTracks } from '@/lib/candidate-identity';
import { claimToBadgeStatus, skillNameForCode } from '@/lib/skill-declarations';
import { ProductTour } from '@/components/tour/ProductTour';
import { DASHBOARD_TOUR_STEPS } from '@/lib/tour-steps';
import { consumeTourAutostart } from '@/lib/tour';
import { NextActionCard } from '@/components/next-action-card';
import { ProfileProgressPanel } from '@/components/profile/ProfileProgressPanel';
import { useProfileProgress } from '@/lib/use-profile-progress';

export default function DashboardPage() {
  const { data: user } = useCurrentUser();
  const { data: tracks } = useTracks();
  const { data: claims } = useQuery({
    queryKey: ['me', 'skill-claims'] as const,
    queryFn: () => api.assessment.listSkillClaims(),
  });
  const {
    loading: profileLoading,
    error: profileError,
    progress,
    visibleRecommendedAction,
    dismissRecommendedAction,
  } = useProfileProgress();
  const [autoStartTour] = useState(consumeTourAutostart);

  const verifiedClaims = (claims ?? []).filter((claim) => claim.status === 'VERIFIED');
  const firstName = firstNameOf(user?.fullName);

  return (
    <div className="relative mx-auto w-full max-w-[900px] pb-16 pt-2">
      <div className="relative z-10 space-y-8">
        <section aria-labelledby="home-greeting">
          <div
            data-tour="candidate-card"
            className="flex flex-col gap-4 sm:flex-row sm:items-center"
          >
            <CandidateAvatar
              fullName={user?.fullName}
              profilePhotoUrl={user?.profilePhotoUrl}
              className="h-16 w-16 shrink-0 border-2 border-[#00fad0]/30 bg-[#00fad0]/10 text-lg font-semibold text-[#00967c]"
              fallbackClassName="bg-[#00fad0]/10 text-lg font-semibold text-[#00967c]"
            />
            <div className="min-w-0">
              <h1
                id="home-greeting"
                className="font-display text-3xl font-medium tracking-tight text-foreground md:text-4xl"
              >
                Welcome back{firstName ? `, ${firstName}` : ''}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{headlineFor(user, tracks)}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Your home base for building your SMART profile and showcasing verified skills.
              </p>
            </div>
          </div>
        </section>

        <section aria-label="Profile completion" className="space-y-4">
          <ProfileProgressPanel
            percent={progress?.percent ?? null}
            areaStatus={progress?.areaStatus ?? null}
            loading={profileLoading}
            showChecklist
          />
          <p className="text-sm text-muted-foreground">
            Reach at least 50% profile completion to unlock skill verification.
          </p>

          {profileError ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {profileError}
            </p>
          ) : null}

          {visibleRecommendedAction ? (
            <NextActionCard action={visibleRecommendedAction} onLater={dismissRecommendedAction} />
          ) : null}

          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#00967c] transition hover:text-[#00fad0]"
          >
            Continue building your profile
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>

        <section
          aria-labelledby="verified-skills-heading"
          data-tour="skills-panel"
          className="surface-panel rounded-[28px] p-6 md:p-7"
        >
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00967c]">
                Verified Skills
              </p>
              <h2
                id="verified-skills-heading"
                className="mt-1 text-xl font-medium text-foreground md:text-2xl"
              >
                Skills you have verified
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Only evidence-backed skills appear here. Declare and verify more in the Skill
                Repository.
              </p>
            </div>
            <Link
              href="/assessments"
              data-tour="manage-skills-link"
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[#00967c] transition hover:text-[#00fad0]"
            >
              Browse Skill Repository
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {!claims ? (
            <p className="text-sm text-muted-foreground">Loading verified skills…</p>
          ) : verifiedClaims.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No verified skills yet. Finish your profile, then pick a skill in the Skill Repository
              to start verification.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {verifiedClaims.map((claim) => (
                <li key={claim.claimId}>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-2 text-[13px] text-foreground">
                    <span className="font-medium">{skillNameForCode(claim.skillCode)}</span>
                    <VerificationBadge status={claimToBadgeStatus(claim)} variant="outline" />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <ProductTour steps={DASHBOARD_TOUR_STEPS} autoStart={autoStartTour} />
    </div>
  );
}
