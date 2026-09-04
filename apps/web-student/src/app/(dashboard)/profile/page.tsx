'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, User } from 'lucide-react';
import { PageHeader, Surface } from '@/components/dashboard/ConsoleChrome';
import { ProjectSubmissionForm } from '@/components/profile/ProjectSubmissionForm';
import { SkillsSection } from '@/components/profile/SkillsSection';
import { WorkExperienceSection } from '@/components/profile/WorkExperienceSection';
import { headlineFor, useCurrentUser, useTracks } from '@/lib/candidate-identity';
import { api } from '@/lib/api';

/** Real, from-API signals only — no fabricated "68% complete" placeholder. */
function useProfileCompletion() {
  const [percent, setPercent] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [onboarding, workExperiences, skillClaims, projects] = await Promise.allSettled([
        api.users.getOnboarding(),
        api.users.listWorkExperiences(),
        api.assessment.listSkillClaims(),
        api.projects.listMine(),
      ]);
      if (cancelled) return;

      const hasGithub =
        onboarding.status === 'fulfilled' &&
        Boolean(onboarding.value.profile?.socialVerification?.github?.verified);
      const hasWorkExperience =
        workExperiences.status === 'fulfilled' && workExperiences.value.length > 0;
      const hasSkillClaim = skillClaims.status === 'fulfilled' && skillClaims.value.length > 0;
      const hasProject = projects.status === 'fulfilled' && projects.value.projects.length > 0;

      const checks = [hasGithub, hasWorkExperience, hasSkillClaim, hasProject];
      const complete = checks.filter(Boolean).length;
      setPercent(Math.round((complete / checks.length) * 100));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return percent;
}

/** Candidate console profile: CN-T04 skills + CN-T08 project submission + Work Experience. */
export default function ProfilePage() {
  const { data: user } = useCurrentUser();
  const { data: tracks } = useTracks();
  const completionPercent = useProfileCompletion();

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-8 pb-12">
      <PageHeader
        title="My Profile"
        subtitle="Profile strength, work experience, skill verification, and project submission for the candidate console."
      />

      <Surface className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00fad0]/15 text-[#00fad0]">
          <User className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-medium text-white">{user?.fullName ?? ''}</h2>
          <p className="text-sm text-white/45">{headlineFor(user, tracks)}</p>
          {completionPercent !== null ? (
            <>
              <div className="mt-3 h-2 max-w-sm overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#00fad0] transition-[width] duration-500"
                  style={{ width: `${String(completionPercent)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-[#00fad0]">{completionPercent}% complete</p>
            </>
          ) : null}
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
        <WorkExperienceSection />
      </Surface>

      <Surface>
        <SkillsSection />
      </Surface>

      <Surface>
        <ProjectSubmissionForm />
      </Surface>
    </div>
  );
}
