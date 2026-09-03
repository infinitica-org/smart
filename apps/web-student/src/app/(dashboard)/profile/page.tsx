'use client';

import Link from 'next/link';
import { ChevronRight, User } from 'lucide-react';
import { queryKeys } from '@smart/api-client';
import { useQuery } from '@smart/ui';
import { PageHeader, Surface } from '@/components/dashboard/ConsoleChrome';
import { ProjectSubmissionForm } from '@/components/profile/ProjectSubmissionForm';
import { SkillsSection } from '@/components/profile/SkillsSection';
import { api } from '@/lib/api';
import { profileSubtitle } from '@/lib/student-identity';

/** Candidate console profile: CN-T04 skills + CN-T08 project submission. */
export default function ProfilePage() {
  const meQuery = useQuery({
    queryKey: queryKeys.me(),
    queryFn: () => api.auth.me(),
  });
  const onboardingQuery = useQuery({
    queryKey: ['me', 'onboarding'],
    queryFn: () => api.users.getOnboarding(),
  });

  const me = meQuery.data;
  const profile = onboardingQuery.data?.profile;
  const latestExperience = profile?.experiences[0];
  const subtitle = me
    ? profileSubtitle({
        institutionName: me.institutionName,
        primaryTrack: me.primaryTrack,
        latestRole: latestExperience?.role,
        latestCompany: latestExperience?.company,
      })
    : null;

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-8 pb-12">
      <PageHeader
        title="My Profile"
        subtitle="Skill verification and project submission for the candidate console."
      />

      <Surface className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00fad0]/15 text-[#00fad0]">
          <User className="h-7 w-7" />
        </div>
        <div className="flex-1">
          {meQuery.isLoading || onboardingQuery.isLoading ? (
            <p className="text-sm text-white/45">Loading profile…</p>
          ) : (
            <>
              <h2 className="text-xl font-medium text-white">{me?.fullName ?? 'Student'}</h2>
              {subtitle ? <p className="text-sm text-white/45">{subtitle}</p> : null}
              {profile?.linkedinUrl ? (
                <p className="mt-2 text-xs text-white/35">{profile.linkedinUrl}</p>
              ) : null}
            </>
          )}
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
        <SkillsSection />
      </Surface>

      <Surface>
        <ProjectSubmissionForm />
      </Surface>
    </div>
  );
}
