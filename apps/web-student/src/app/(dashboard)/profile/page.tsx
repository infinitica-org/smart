'use client';

import { CheckCircle2 } from 'lucide-react';

import { AboutSection } from '@/components/profile/AboutSection';

import { CandidateAvatar } from '@/components/profile/CandidateAvatar';

import { CertificatesSection } from '@/components/profile/CertificatesSection';

import { EducationSection } from '@/components/profile/EducationSection';

import { JobPreferencesSection } from '@/components/profile/JobPreferencesSection';

import { LanguagesSection } from '@/components/profile/LanguagesSection';

import { ProfessionalLinksSection } from '@/components/profile/ProfessionalLinksSection';

import { ProfileProgressPanel } from '@/components/profile/ProfileProgressPanel';

import { ProjectSubmissionForm } from '@/components/profile/ProjectSubmissionForm';

import { ResumeSection } from '@/components/profile/ResumeSection';

import { WorkExperienceSection } from '@/components/profile/WorkExperienceSection';

import { NextActionCard } from '@/components/next-action-card';

import { headlineFor, useCurrentUser, useTracks } from '@/lib/candidate-identity';

import type { ProfileAreaId } from '@/lib/profile-progress';
import { useProfileProgress } from '@/lib/use-profile-progress';

/** Candidate console profile: progressive profile sections in Phase 5 order. */

export default function ProfilePage() {
  const { data: user } = useCurrentUser();

  const { data: tracks } = useTracks();

  const {
    loading,

    error,

    progress,

    visibleRecommendedAction,

    dismissRecommendedAction,

    linkedinVerified,

    githubVerified,
  } = useProfileProgress();

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-8 pb-12">
      <section className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00967c]">
          My Profile
        </p>

        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Build your SMART profile
        </h1>

        <p className="max-w-2xl text-sm text-muted-foreground">
          Add useful information at your own pace — education, experience, links, and more.
        </p>
      </section>

      <SurfaceHeader
        user={user}

        tracks={tracks}

        linkedinVerified={linkedinVerified}

        githubVerified={githubVerified}

        profilePercent={progress?.percent ?? null}

        profileLoading={loading}

        areaStatus={progress?.areaStatus ?? null}
      />

      {error ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      ) : null}

      {visibleRecommendedAction ? (
        <NextActionCard action={visibleRecommendedAction} onLater={dismissRecommendedAction} />
      ) : null}

      <div id="about" className="scroll-mt-24">
        <ProfileSurface>
          <AboutSection />
        </ProfileSurface>
      </div>

      <div id="education" className="scroll-mt-24">
        <ProfileSurface>
          <EducationSection />
        </ProfileSurface>
      </div>

      <div id="experience" className="scroll-mt-24">
        <ProfileSurface>
          <WorkExperienceSection />
        </ProfileSurface>
      </div>

      <div id="languages" className="scroll-mt-24">
        <ProfileSurface>
          <LanguagesSection />
        </ProfileSurface>
      </div>

      <div id="certificates" className="scroll-mt-24">
        <ProfileSurface>
          <CertificatesSection />
        </ProfileSurface>
      </div>

      <div id="links" className="scroll-mt-24">
        <ProfileSurface>
          <ProfessionalLinksSection />
        </ProfileSurface>
      </div>

      <div id="projects" className="scroll-mt-24">
        <ProfileSurface>
          <ProjectSubmissionForm />
        </ProfileSurface>
      </div>

      <div id="preferences" className="scroll-mt-24">
        <ProfileSurface>
          <JobPreferencesSection />
        </ProfileSurface>
      </div>

      <div id="resume" className="scroll-mt-24">
        <ProfileSurface>
          <ResumeSection />
        </ProfileSurface>
      </div>
    </div>
  );
}

function ProfileSurface({ children }: { children: React.ReactNode }) {
  return (
    <div className="surface-panel rounded-[28px] border border-border bg-card p-6 md:p-7">
      {children}
    </div>
  );
}

function SurfaceHeader({
  user,

  tracks,

  linkedinVerified,

  githubVerified,

  profilePercent,

  profileLoading,

  areaStatus,
}: {
  user: ReturnType<typeof useCurrentUser>['data'];

  tracks: ReturnType<typeof useTracks>['data'];

  linkedinVerified: boolean;

  githubVerified: boolean;

  profilePercent: number | null;

  profileLoading: boolean;

  areaStatus: Record<ProfileAreaId, boolean> | null;
}) {
  return (
    <section className="surface-panel rounded-[28px] border border-border bg-card p-6 md:p-7">
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <CandidateAvatar
          fullName={user?.fullName}

          profilePhotoUrl={user?.profilePhotoUrl}

          className="h-20 w-20 rounded-2xl border border-[#00fad0]/30 bg-[#00fad0]/10 text-2xl font-semibold text-[#00967c]"

          fallbackClassName="rounded-2xl bg-[#00fad0]/10 text-2xl font-semibold text-[#00967c]"
        />

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-medium text-foreground">{user?.fullName ?? ''}</h2>

            {linkedinVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-700" />
                LinkedIn Verified
              </span>
            ) : null}

            {githubVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-purple-700" />
                GitHub Verified
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-sm text-muted-foreground">{headlineFor(user, tracks)}</p>

          {!profileLoading && profilePercent !== null ? (
            <p className="mt-2 text-sm font-medium text-[#00fad0]">
              {profilePercent}% profile complete
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 border-t border-border pt-6">
        <ProfileProgressPanel
          percent={profilePercent}

          areaStatus={areaStatus}

          loading={profileLoading}

          showChecklist
        />
      </div>
    </section>
  );
}
