'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CandidateAvatar } from '@/components/profile/CandidateAvatar';
import { ProfileProgressPanel } from '@/components/profile/ProfileProgressPanel';
import { ProfileCompletionHeroCard } from '@/components/dashboard/ProfileCompletionHeroCard';
import { WhyCompleteProfileCard } from '@/components/dashboard/WhyCompleteProfileCard';
import { VerifiedSkillsPanel } from '@/components/dashboard/VerifiedSkillsPanel';
import { DashboardFooter } from '@/components/dashboard/DashboardFooter';
import { NextActionCard } from '@/components/next-action-card';
import { ProductTour } from '@/components/tour/ProductTour';
import { firstNameOf, useCurrentUser } from '@/lib/candidate-identity';
import { dashboardStatusChips } from '@/lib/dashboard-status-chips';
import { dashboardTimeEyebrow } from '@/lib/dashboard-greeting';
import { DASHBOARD_TOUR_STEPS } from '@/lib/tour-steps';
import { consumeTourAutostart } from '@/lib/tour';
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
  } = useProfileProgress();
  const [autoStartTour] = useState(consumeTourAutostart);

  const firstName = firstNameOf(user?.fullName);
  const profilePercent = progress?.percent ?? null;
  const timeEyebrow = useMemo(() => dashboardTimeEyebrow(), []);
  const statusChips = useMemo(() => dashboardStatusChips(input), [input]);

  return (
    <div className="mx-auto w-full max-w-[1400px] pb-6 pt-1">
      <div className="space-y-5 md:space-y-6">
        <section aria-labelledby="home-greeting">
          <div
            data-tour="candidate-card"
            className="grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:items-start"
          >
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start">
              <CandidateAvatar
                fullName={user?.fullName}
                profilePhotoUrl={user?.profilePhotoUrl}
                className="h-24 w-24 shrink-0 border border-[var(--ds-border)] bg-[var(--ds-surface)] text-lg font-semibold text-[var(--ds-text)] md:h-[6.5rem] md:w-[6.5rem]"
                fallbackClassName="bg-[var(--ds-surface-muted)] text-lg font-semibold text-[var(--ds-text)]"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ds-text-muted)]">
                  {timeEyebrow}
                </p>
                <h1
                  id="home-greeting"
                  className="mt-1 text-[2rem] font-semibold tracking-tight text-[var(--ds-text)] md:text-[2.375rem] md:leading-tight"
                >
                  Welcome back{firstName ? `, ${firstName}` : ''}
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--ds-text-muted)] md:text-[15px]">
                  Build your verified professional profile and unlock new opportunities.
                </p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {statusChips.map((chip) => {
                    const Icon = chip.icon;
                    return (
                      <li key={chip.label}>
                        <span className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-chip-bg)] px-3.5 py-2.5 text-sm text-[var(--ds-icon)]">
                          <Icon className="h-4 w-4 text-[var(--ds-green)]" aria-hidden="true" />
                          {chip.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            <ProfileCompletionHeroCard
              percent={profilePercent}
              areaStatus={progress?.areaStatus ?? null}
              loading={profileLoading}
            />
          </div>
        </section>

        {profileError ? (
          <p
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            {profileError}
          </p>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:gap-6">
          <ProfileProgressPanel
            percent={profilePercent}
            areaStatus={progress?.areaStatus ?? null}
            loading={profileLoading}
            showChecklist
            variant="dashboard"
          />
          <WhyCompleteProfileCard />
        </div>

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
