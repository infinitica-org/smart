'use client';

import { CheckCircle2, User } from 'lucide-react';
import { PageHeader, Surface } from '@/components/dashboard/ConsoleChrome';
import { CertificatesSection } from '@/components/profile/CertificatesSection';
import { EducationSection } from '@/components/profile/EducationSection';
import { JobPreferencesSection } from '@/components/profile/JobPreferencesSection';
import { LanguagesSection } from '@/components/profile/LanguagesSection';
import { ProfessionalLinksSection } from '@/components/profile/ProfessionalLinksSection';
import { ProfileProgressPanel } from '@/components/profile/ProfileProgressPanel';
import { ProjectSubmissionForm } from '@/components/profile/ProjectSubmissionForm';
import { SkillsSection } from '@/components/profile/SkillsSection';
import { WorkExperienceSection } from '@/components/profile/WorkExperienceSection';
import { NextActionCard } from '@/components/next-action-card';
import { headlineFor, useCurrentUser, useTracks } from '@/lib/candidate-identity';
import { useProfileProgress } from '@/lib/use-profile-progress';

/** Candidate console profile: CN-T03 Education/Experience/Languages/Certificates, CN-T04 skills, CN-T08 project submission. */
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
      <PageHeader
        title="My Profile"
        subtitle="Build your SMART profile at your own pace — add useful information when you are ready."
      />

      <Surface className="flex flex-col gap-4 border-white/10 bg-[#141414] md:flex-row md:items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00fad0]/15 text-[#00fad0]">
          <User className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-medium text-white">{user?.fullName ?? ''}</h2>
            {linkedinVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/15 px-2.5 py-0.5 text-xs font-semibold text-blue-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                LinkedIn Verified
              </span>
            ) : null}
            {githubVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/15 px-2.5 py-0.5 text-xs font-semibold text-purple-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-purple-400" />
                GitHub Verified
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-white/45">{headlineFor(user, tracks)}</p>
        </div>
      </Surface>

      <ProfileProgressPanel
        percent={progress?.percent ?? null}
        areaStatus={progress?.areaStatus ?? null}
        loading={loading}
      />

      {error ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </p>
      ) : null}

      {visibleRecommendedAction ? (
        <NextActionCard action={visibleRecommendedAction} onLater={dismissRecommendedAction} />
      ) : null}

      <div id="education" className="scroll-mt-24">
        <Surface className="border-white/10 bg-[#141414]">
          <EducationSection />
        </Surface>
      </div>

      <div id="experience" className="scroll-mt-24">
        <Surface className="border-white/10 bg-[#141414]">
          <WorkExperienceSection />
        </Surface>
      </div>

      <div id="languages" className="scroll-mt-24">
        <Surface className="border-white/10 bg-[#141414]">
          <LanguagesSection />
        </Surface>
      </div>

      <div id="certificates" className="scroll-mt-24">
        <Surface className="border-white/10 bg-[#141414]">
          <CertificatesSection />
        </Surface>
      </div>

      <div id="skills" className="scroll-mt-24">
        <Surface className="border-white/10 bg-[#141414]">
          <SkillsSection />
        </Surface>
      </div>

      <div id="projects" className="scroll-mt-24">
        <Surface className="border-white/10 bg-[#141414]">
          <ProjectSubmissionForm />
        </Surface>
      </div>

      <div id="links" className="scroll-mt-24">
        <Surface className="border-white/10 bg-[#141414]">
          <ProfessionalLinksSection />
        </Surface>
      </div>

      <div id="preferences" className="scroll-mt-24">
        <Surface className="border-white/10 bg-[#141414]">
          <JobPreferencesSection />
        </Surface>
      </div>
    </div>
  );
}
