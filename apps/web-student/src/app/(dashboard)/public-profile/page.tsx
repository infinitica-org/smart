'use client';

import { Code2, FolderGit2, Globe } from 'lucide-react';
import { queryKeys } from '@smart/api-client';
import { useQuery } from '@smart/ui';
import { api } from '@/lib/api';
import { claimStatusLabel, claimToBadgeStatus, skillNameForCode } from '@/lib/skill-declarations';
import { initialsFromFullName, profileSubtitle } from '@/lib/student-identity';

export default function PublicProfilePreviewPage() {
  const meQuery = useQuery({
    queryKey: queryKeys.me(),
    queryFn: () => api.auth.me(),
  });
  const onboardingQuery = useQuery({
    queryKey: ['me', 'onboarding'],
    queryFn: () => api.users.getOnboarding(),
  });
  const claimsQuery = useQuery({
    queryKey: ['assessment', 'skill-claims'],
    queryFn: () => api.assessment.listSkillClaims(),
  });

  const me = meQuery.data;
  const fullName = me?.fullName?.trim() || 'Student';
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
  const claims = claimsQuery.data ?? [];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-none bg-transparent px-8 py-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="font-display flex items-center gap-3 text-2xl font-medium text-white">
              Public profile preview
              <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium tracking-wide text-white/70">
                Placeholder
              </span>
            </h1>
            <p className="mt-1 text-sm text-white/40">
              This is a private preview. There is no public profile URL or share contract in V1.
            </p>
          </div>
          <button
            type="button"
            disabled
            className="flex cursor-not-allowed items-center gap-2 rounded-full bg-white/5 px-5 py-2.5 text-sm font-medium text-white/35"
          >
            <Globe className="h-4 w-4" />
            Sharing unavailable
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="overflow-hidden rounded-[40px] border border-white/5 bg-[#1c1c1e]">
            <div className="relative h-32 bg-gradient-to-r from-[#00fad0]/20 to-blue-500/20">
              <div className="absolute -bottom-12 left-8 h-24 w-24 rounded-full bg-[#161616] p-1.5">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-2xl font-bold text-black">
                  {initialsFromFullName(fullName)}
                </div>
              </div>
            </div>

            <div className="px-8 pt-16 pb-8">
              <h2 className="text-2xl font-bold text-white">{fullName}</h2>
              {subtitle ? <p className="mt-1 font-medium text-white/60">{subtitle}</p> : null}

              <div className="mt-10">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                  <Code2 className="h-4 w-4 text-white/50" />
                  Skills
                </h3>
                {claims.length === 0 ? (
                  <p className="text-sm text-white/40">No skill claims to preview.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {claims.map((claim) => {
                      const badge = claimToBadgeStatus(claim);
                      return (
                        <div
                          key={claim.claimId}
                          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5"
                        >
                          <span className="text-sm font-medium text-white">
                            {skillNameForCode(claim.skillCode)}
                          </span>
                          <div className="h-3 w-px bg-white/20" />
                          <span className="text-xs font-bold text-[#00fad0]">
                            {claimStatusLabel(badge)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-10 border-t border-white/5 pt-10">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                  <FolderGit2 className="h-4 w-4 text-white/50" />
                  Projects
                </h3>
                <p className="text-sm text-white/40">
                  Project listing is unavailable. There is no GET /projects collection for the
                  public preview.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
