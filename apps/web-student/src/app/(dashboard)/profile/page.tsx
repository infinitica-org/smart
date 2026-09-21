'use client';

import { Suspense } from 'react';

import { CertificatesSection } from '@/components/profile/CertificatesSection';

import { CredentialsSection } from '@/components/profile/CredentialsSection';

import { EducationSection } from '@/components/profile/EducationSection';

import { LanguagesSection } from '@/components/profile/LanguagesSection';

import { ProfessionalLinksSection } from '@/components/profile/ProfessionalLinksSection';

import { ProfileHeroBanner } from '@/components/profile/ProfileHeroBanner';
import { ProfilePublicLinkCard } from '@/components/profile/ProfilePublicLinkCard';

import { ProfileTopNav } from '@/components/profile/ProfileTopNav';

import { ProfileSurface } from '@/components/profile/ProfileSurface';

import { ProjectSubmissionForm } from '@/components/profile/ProjectSubmissionForm';

import { ResumeSection } from '@/components/profile/ResumeSection';

import { SkillsSection } from '@/components/profile/SkillsSection';
import { WorkExperienceSection } from '@/components/profile/WorkExperienceSection';

import { NextActionCard } from '@/components/next-action-card';

import { useCurrentUser } from '@/lib/candidate-identity';

import { PROFILE_AREA_IDS } from '@/lib/profile-progress';

import { profileSectionMeta, type ProfileSectionId } from '@/lib/profile-sections';

import { useProfileSection } from '@/lib/use-profile-section';

import { useProfileProgress } from '@/lib/use-profile-progress';
import { studentWarningBannerClass } from '@/lib/student-ui-classes';

function ProfilePageFallback() {
  return (
    <div className="min-h-[40vh] bg-[var(--ds-canvas)] px-8 py-10">
      <p className="text-sm text-[var(--student-text-secondary)]">Loading profile…</p>
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

  const sectionContent = renderSection(section);

  return (
    <div className="min-h-full bg-[var(--ds-canvas)]">
      <div className="min-h-[calc(100dvh-3.5rem)] w-full min-w-0">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-8 md:py-8 lg:px-6 xl:px-8">
          <ProfileHeroBanner
            user={user}
            education={input?.education ?? []}
            linkedinVerified={linkedinVerified}
            githubVerified={githubVerified}
            percent={progress?.percent ?? null}
            completedCount={completedCount}
            areaStatus={progress?.areaStatus}
            loading={loading}
          />

          <div className="mt-4 md:mt-5">
            <ProfilePublicLinkCard />
          </div>

          {visibleRecommendedAction ? (
            <div className="mt-4 max-w-3xl md:mt-5">
              <NextActionCard
                action={visibleRecommendedAction}
                onLater={dismissRecommendedAction}
                compact
              />
            </div>
          ) : null}

          <ProfileTopNav activeSection={section} onSelect={setSection} className="mt-4 md:mt-5" />

          {section !== 'education' &&
          section !== 'certifications' &&
          section !== 'experience' &&
          section !== 'projects' &&
          section !== 'credentials' &&
          section !== 'languages' &&
          section !== 'skills' &&
          section !== 'links' &&
          section !== 'resume' ? (
            <header className="mt-5 space-y-2 md:mt-6">
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--ds-text-muted)]">
                My Profile
              </p>

              <h1 className="text-[32px] font-semibold leading-[1.15] tracking-tight text-[var(--ds-text)]">
                {meta.title}
              </h1>

              <p className="max-w-[720px] text-base leading-relaxed text-[var(--ds-text-muted)]">
                {meta.description}
              </p>
            </header>
          ) : null}

          {error ? <p className={`mt-6 ${studentWarningBannerClass}`}>{error}</p> : null}

          {section === 'experience' ||
          section === 'projects' ||
          section === 'education' ||
          section === 'certifications' ||
          section === 'credentials' ||
          section === 'languages' ||
          section === 'skills' ||
          section === 'links' ||
          section === 'resume' ? (
            <div className="mt-5 min-w-0 max-w-none">{sectionContent}</div>
          ) : (
            <div className="mt-7 max-w-3xl">
              <ProfileSurface>{sectionContent}</ProfileSurface>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function renderSection(section: ProfileSectionId) {
  switch (section) {
    case 'experience':
      return <WorkExperienceSection />;

    case 'projects':
      return <ProjectSubmissionForm />;

    case 'education':
      return <EducationSection />;

    case 'certifications':
      return <CertificatesSection />;

    case 'credentials':
      return <CredentialsSection />;

    case 'languages':
      return <LanguagesSection />;

    case 'skills':
      return <SkillsSection />;

    case 'links':
      return <ProfessionalLinksSection />;

    case 'resume':
      return <ResumeSection />;

    default:
      return <WorkExperienceSection />;
  }
}
