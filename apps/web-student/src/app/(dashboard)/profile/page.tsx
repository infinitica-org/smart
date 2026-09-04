'use client';

import Link from 'next/link';
import { ChevronRight, User } from 'lucide-react';
import { PageHeader, Surface } from '@/components/dashboard/ConsoleChrome';
import { ProjectSubmissionForm } from '@/components/profile/ProjectSubmissionForm';
import { SkillsSection } from '@/components/profile/SkillsSection';
import { CertificatesSection } from '@/components/profile/CertificatesSection';
import { SectionVisibilityToggles } from '@/components/profile/SectionVisibilityToggles';
import { WorkExperienceSection } from '@/components/profile/WorkExperienceSection';
import { DEFAULT_PROFILE } from '@/lib/candidate-dashboard-data';

/** Candidate console profile: CN-T04 skills + CN-T07 public profile visibility + CN-T08 project submission + Work Experience. */
export default function ProfilePage() {
  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-8 pb-12">
      <PageHeader
        title="My Profile"
        subtitle="Profile strength, work experience, skill verification, public profile visibility, and project submission."
      />

      <Surface className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00fad0]/15 text-[#00fad0]">
          <User className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-medium text-white">
            {DEFAULT_PROFILE.firstName} {DEFAULT_PROFILE.lastName}
          </h2>
          <p className="text-sm text-white/45">{DEFAULT_PROFILE.headline}</p>
          <div className="mt-3 h-2 max-w-sm overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#00fad0]"
              style={{ width: `${DEFAULT_PROFILE.completionPercent}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-[#00fad0]">
            {DEFAULT_PROFILE.completionPercent}% complete
          </p>
        </div>
        <Link
          href="/public-profile"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white"
        >
          Public preview
          <ChevronRight className="h-4 w-4" />
        </Link>
      </Surface>

      <Surface>
        <SectionVisibilityToggles />
      </Surface>

      <Surface>
        <WorkExperienceSection />
      </Surface>

      <Surface>
        <SkillsSection />
      </Surface>

      <Surface>
        <CertificatesSection />
      </Surface>

      <Surface>
        <ProjectSubmissionForm />
      </Surface>
    </div>
  );
}
