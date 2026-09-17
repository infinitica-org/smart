'use client';

import { Suspense, useMemo } from 'react';

import { AboutSection } from '@/components/profile/AboutSection';

import { AcademicScoresSection } from '@/components/profile/AcademicScoresSection';

import { CertificatesSection } from '@/components/profile/CertificatesSection';

import { CredentialsSection } from '@/components/profile/CredentialsSection';

import { EducationSection } from '@/components/profile/EducationSection';

import { JobPreferencesSection } from '@/components/profile/JobPreferencesSection';

import { LanguagesSection } from '@/components/profile/LanguagesSection';

import { ProfessionalLinksSection } from '@/components/profile/ProfessionalLinksSection';

import { ProfileCompletionCard } from '@/components/profile/ProfileCompletionCard';

import { ProfileIdentityCard } from '@/components/profile/ProfileIdentityCard';

import { ProfileKeyHighlights } from '@/components/profile/ProfileKeyHighlights';

import { ProfileMobileNav } from '@/components/profile/ProfileMobileNav';

import { ProfileSidebar } from '@/components/profile/ProfileSidebar';

import { ProfileSurface } from '@/components/profile/ProfileSurface';

import { ProfileWhyCompleteCard } from '@/components/profile/ProfileWhyCompleteCard';

import { ProjectSubmissionForm } from '@/components/profile/ProjectSubmissionForm';

import { ResumeSection } from '@/components/profile/ResumeSection';

import { WorkExperienceSection } from '@/components/profile/WorkExperienceSection';

import { NextActionCard } from '@/components/next-action-card';

import { headlineFor, useCurrentUser, useTracks } from '@/lib/candidate-identity';

import { PROFILE_EXPERIENCE_HEADER_ACTIONS_ID } from '@/lib/profile-experience-header';
import { PROFILE_PROJECTS_HEADER_ACTIONS_ID } from '@/lib/profile-projects-header';

import { buildProfileHighlights } from '@/lib/profile-highlights';

import { PROFILE_AREA_IDS } from '@/lib/profile-progress';

import { profileSectionMeta, type ProfileSectionId } from '@/lib/profile-sections';

import { useProfileSection } from '@/lib/use-profile-section';

import { useProfileProgress } from '@/lib/use-profile-progress';

const ABOUT_PAGE_GRID =
  'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,34%)] lg:items-start lg:gap-6';
const ABOUT_MAIN_STACK = 'flex flex-col gap-6';
const ABOUT_RAIL_STACK = 'flex flex-col gap-6';

function ProfilePageFallback() {
  return (
    <div className="min-h-[40vh] bg-[var(--ds-canvas)] px-8 py-10">
      <p className="text-sm text-[#64748B]">Loading profile…</p>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfilePageFallback />}>
      <ProfileWorkspace />
    </Suspense>
  );
}

function ProfileWorkspace() {
  const { section, setSection } = useProfileSection();

  const { data: user } = useCurrentUser();

  const { data: tracks } = useTracks();

  const {
    loading,

    error,

    progress,

    input,

    visibleRecommendedAction,

    dismissRecommendedAction,

    linkedinVerified,

    githubVerified,
  } = useProfileProgress();

  const meta = profileSectionMeta(section);

  const completedCount = progress
    ? PROFILE_AREA_IDS.filter((id) => progress.areaStatus[id]).length
    : null;

  const highlights = useMemo(() => {
    if (!input) {
      return buildProfileHighlights({
        experiences: [],

        education: [],

        onboardingProfile: null,

        onboardingDraft: null,

        roleHeadline: headlineFor(user, tracks),
      });
    }

    return buildProfileHighlights({
      experiences: input.experiences,

      education: input.education,

      onboardingProfile: input.onboardingProfile,

      onboardingDraft: input.onboardingDraft,

      roleHeadline: headlineFor(user, tracks),
    });
  }, [input, user, tracks]);

  const jobPreferences = useMemo(() => {
    return (
      input?.onboardingProfile?.jobPreferences ?? input?.onboardingDraft?.jobPreferences ?? null
    );
  }, [input]);

  const sectionContent = renderSection(section);

  return (
    <div className="min-h-full bg-[var(--ds-canvas)]">
      <div className="flex min-h-[calc(100dvh-4.25rem)] w-full">
        <ProfileSidebar activeSection={section} onSelect={setSection} />

        <div className="min-w-0 flex-1">
          <div className="w-full max-w-[1280px] px-4 py-6 md:px-8 md:py-8 lg:px-6 xl:px-8">
            <ProfileMobileNav activeSection={section} onSelect={setSection} />

            <header
              className={`mt-3 md:mt-0 ${section === 'about' ? 'space-y-1' : section === 'experience' || section === 'projects' ? 'space-y-2 lg:flex lg:items-end lg:justify-between lg:gap-6' : 'space-y-2'}`}
            >
              <div
                className={
                  section === 'experience' || section === 'projects'
                    ? 'min-w-0 flex-1 space-y-2'
                    : undefined
                }
              >
                <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--ds-text-muted)]">
                  My Profile
                </p>

                <h1 className="text-[32px] font-semibold leading-[1.15] tracking-tight text-[var(--ds-text)]">
                  {section === 'about' ? 'About You' : meta.title}
                </h1>

                {section !== 'about' ? (
                  <p className="max-w-[720px] text-base leading-relaxed text-[var(--ds-text-muted)]">
                    {meta.description}
                  </p>
                ) : null}
              </div>

              {section === 'experience' ? (
                <div
                  id={PROFILE_EXPERIENCE_HEADER_ACTIONS_ID}
                  className="flex shrink-0 items-center lg:pb-1"
                />
              ) : null}
              {section === 'projects' ? (
                <div
                  id={PROFILE_PROJECTS_HEADER_ACTIONS_ID}
                  className="flex shrink-0 items-center lg:pb-1"
                />
              ) : null}
            </header>

            {error ? (
              <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {error}
              </p>
            ) : null}

            {section === 'about' ? (
              <div className={`mt-6 ${ABOUT_PAGE_GRID}`}>
                <div className={ABOUT_MAIN_STACK}>
                  <ProfileIdentityCard
                    user={user}
                    education={input?.education ?? []}
                    jobPreferences={jobPreferences}
                    linkedinVerified={linkedinVerified}
                    githubVerified={githubVerified}
                  />

                  <ProfileSurface>
                    <AboutSection presentation="summary" />
                  </ProfileSurface>

                  <ProfileKeyHighlights highlights={highlights} />
                </div>

                <div className={ABOUT_RAIL_STACK}>
                  <ProfileCompletionCard
                    percent={progress?.percent ?? null}
                    completedCount={completedCount}
                    areaStatus={progress?.areaStatus}
                    loading={loading}
                  />

                  <ProfileWhyCompleteCard />

                  {visibleRecommendedAction ? (
                    <NextActionCard
                      action={visibleRecommendedAction}
                      onLater={dismissRecommendedAction}
                      compact
                    />
                  ) : null}
                </div>
              </div>
            ) : section === 'experience' || section === 'projects' ? (
              <div className="mt-7 min-w-0 max-w-none">{sectionContent}</div>
            ) : (
              <div className="mt-7 max-w-3xl">
                <ProfileSurface>{sectionContent}</ProfileSurface>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function renderSection(section: ProfileSectionId) {
  switch (section) {
    case 'about':
      return <AboutSection presentation="summary" />;

    case 'experience':
      return <WorkExperienceSection />;

    case 'projects':
      return <ProjectSubmissionForm />;

    case 'education':
      return (
        <div className="flex flex-col gap-6">
          <EducationSection />
          <AcademicScoresSection />
        </div>
      );

    case 'certifications':
      return <CertificatesSection />;

    case 'credentials':
      return <CredentialsSection />;

    case 'languages':
      return <LanguagesSection />;

    case 'links':
      return <ProfessionalLinksSection />;

    case 'preferences':
      return <JobPreferencesSection />;

    case 'resume':
      return <ResumeSection />;

    default:
      return <AboutSection presentation="summary" />;
  }
}
