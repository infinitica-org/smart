'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ProfileHeroBanner } from '@/components/profile/ProfileHeroBanner';
import { ProfilePublicLinkCard } from '@/components/profile/ProfilePublicLinkCard';
import { ProfileProgressPanel } from '@/components/profile/ProfileProgressPanel';
import { VerifiedSkillsPanel } from '@/components/dashboard/VerifiedSkillsPanel';
import { DashboardFooter } from '@/components/dashboard/DashboardFooter';
import { NextActionCard } from '@/components/next-action-card';
import { ProductTour } from '@/components/tour/ProductTour';
import { firstNameOf, useCurrentUser } from '@/lib/candidate-identity';
import { dashboardTimeEyebrow } from '@/lib/dashboard-greeting';
import { DASHBOARD_TOUR_STEPS } from '@/lib/tour-steps';
import { consumeTourAutostart } from '@/lib/tour';
import { PROFILE_AREA_IDS } from '@/lib/profile-progress';
import { studentWarningBannerClass } from '@/lib/student-ui-classes';
import { useProfileProgress } from '@/lib/use-profile-progress';

export default function DashboardPage() {
  const { data: user } = useCurrentUser();
  const {
    loading: profileLoading,
    error: profileError,
    progress,
    input,
    skillClaims,
    visibleRecommendedAction,
    dismissRecommendedAction,
    linkedinVerified,
    githubVerified,
  } = useProfileProgress();
  const [autoStartTour] = useState(consumeTourAutostart);

  const profilePercent = progress?.percent ?? null;
  const completedCount = progress
    ? PROFILE_AREA_IDS.filter((id) => progress.areaStatus[id]).length
    : null;

  const firstName = firstNameOf(user?.fullName);
  const timeEyebrow = useMemo(() => dashboardTimeEyebrow(), []);

  const tourCandidateAnchor = useMemo(() => ({ 'data-tour': 'candidate-card' as const }), []);

  return (
    <div className="mx-auto w-full max-w-[1400px] pb-6 pt-1">
      <div className="space-y-5 md:space-y-6">
        <header aria-labelledby="home-greeting" className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ds-text-muted)]">
            {timeEyebrow}
          </p>
          <h1
            id="home-greeting"
            className="mt-1 text-[1.75rem] font-semibold tracking-tight text-[var(--ds-text)] md:text-[2rem] md:leading-tight"
          >
            Welcome back{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--ds-text-muted)] md:text-[15px]">
            Build your verified professional profile and unlock new opportunities.
          </p>
        </header>

        <div {...tourCandidateAnchor}>
          <ProfileHeroBanner
            user={user}
            education={input?.education ?? []}
            linkedinVerified={linkedinVerified}
            githubVerified={githubVerified}
            percent={profilePercent}
            completedCount={completedCount}
            areaStatus={progress?.areaStatus}
            loading={profileLoading}
          />
          <div className="mt-4 md:mt-5">
            <ProfilePublicLinkCard />
          </div>
        </div>

        {profileError ? (
          <p role="alert" className={studentWarningBannerClass}>
            {profileError}
          </p>
        ) : null}

        <ProfileProgressPanel
          percent={profilePercent}
          areaStatus={progress?.areaStatus ?? null}
          loading={profileLoading}
          showChecklist
          variant="dashboard"
        />

        <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
          <div>
            {visibleRecommendedAction ? (
              <NextActionCard
                action={visibleRecommendedAction}
                onLater={dismissRecommendedAction}
              />
            ) : (
              <section className="flex h-full min-h-[12rem] flex-col justify-center rounded-[14px] border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface)] p-6 text-center">
                <p className="text-sm font-semibold text-[var(--ds-text)]">You&apos;re on track</p>
                <p className="mt-1 text-sm text-[var(--ds-text-muted)]">
                  No recommended action right now. Continue completing your profile sections above.
                </p>
                <Link
                  href="/profile"
                  className="mt-4 inline-flex items-center justify-center gap-2 text-sm font-semibold text-[var(--ds-link)]"
                >
                  View profile
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </section>
            )}
          </div>
          <VerifiedSkillsPanel claims={profileLoading ? undefined : skillClaims} />
        </div>

        <DashboardFooter />
      </div>
      <ProductTour steps={DASHBOARD_TOUR_STEPS} autoStart={autoStartTour} />
    </div>
  );
}
