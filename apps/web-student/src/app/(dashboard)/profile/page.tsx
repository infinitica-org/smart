'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, User } from 'lucide-react';
import { PageHeader, Surface } from '@/components/dashboard/ConsoleChrome';
import { ProjectSubmissionForm } from '@/components/profile/ProjectSubmissionForm';
import { SkillsSection } from '@/components/profile/SkillsSection';
import { headlineFor, useCurrentUser, useTracks } from '@/lib/candidate-identity';
import { api } from '@/lib/api';

function useProfileCompletionData() {
  const [data, setData] = useState<{
    percent: number | null;
    linkedinVerified: boolean;
    githubVerified: boolean;
  }>({ percent: null, linkedinVerified: false, githubVerified: false });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [onboardingRes, skillClaimsRes] = await Promise.allSettled([
        api.users.getOnboarding(),
        api.assessment.listSkillClaims(),
      ]);
      if (cancelled) return;

      const profile = onboardingRes.status === 'fulfilled' ? onboardingRes.value.profile : null;
      const draft = onboardingRes.status === 'fulfilled' ? onboardingRes.value.draft : null;
      const claims = skillClaimsRes.status === 'fulfilled' ? skillClaimsRes.value : [];

      const linkedinVerified = Boolean(
        profile?.socialVerification?.linkedin?.verified ||
        draft?.socialVerification?.linkedin?.verified,
      );
      const githubVerified = Boolean(
        profile?.socialVerification?.github?.verified ||
        draft?.socialVerification?.github?.verified,
      );

      const hasBasicInfo = Boolean(profile?.firstName || draft?.firstName);
      const hasSkills =
        claims.length > 0 ||
        Boolean(profile?.skills && profile.skills.length > 0) ||
        Boolean(draft?.skills && draft.skills.length > 0);
      const hasLanguages = Boolean(
        profile?.skills?.some((s) => s.type === 'language') ||
        draft?.skills?.some((s) => s.type === 'language'),
      );
      const hasPreferences = Boolean(
        profile?.jobPreferences?.expectedCtcLakhs || draft?.jobPreferences?.expectedCtcLakhs,
      );
      const hasSocial = linkedinVerified || githubVerified;

      const checks = [hasBasicInfo, hasSkills, hasLanguages, hasPreferences, hasSocial];
      const completedCount = checks.filter(Boolean).length;
      const percent = Math.round((completedCount / checks.length) * 100);

      setData({ percent, linkedinVerified, githubVerified });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}

/** Candidate console profile: CN-T04 skills + CN-T08 project submission. */
export default function ProfilePage() {
  const { data: user } = useCurrentUser();
  const { data: tracks } = useTracks();
  const {
    percent: completionPercent,
    linkedinVerified,
    githubVerified,
  } = useProfileCompletionData();

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-8 pb-12">
      <PageHeader
        title="My Profile"
        subtitle="Profile strength, skill verification, and project submission for the candidate console."
      />

      <Surface className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00fad0]/15 text-[#00fad0]">
          <User className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-medium text-white">{user?.fullName ?? ''}</h2>
            {linkedinVerified && (
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/15 px-2.5 py-0.5 text-xs font-semibold text-blue-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                LinkedIn Verified
              </span>
            )}
            {githubVerified && (
              <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/15 px-2.5 py-0.5 text-xs font-semibold text-purple-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-purple-400" />
                GitHub Verified
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-white/45">{headlineFor(user, tracks)}</p>
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
