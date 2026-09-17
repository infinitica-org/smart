'use client';

import { useCallback, useMemo, useState } from 'react';
import type { SkillClaimDto } from '@smart/contracts';
import { queryKeys } from '@smart/api-client';
import { useQuery } from '@smart/ui';
import { api } from '@/lib/api';
import {
  computeProfileCompletion,
  dismissRecommendedAction,
  recommendNextAction,
  resolveVisibleRecommendedAction,
  type ProfileProgressInput,
  type ProfileProgressResult,
  type RecommendedAction,
} from '@/lib/profile-progress';

const PROFILE_STALE_MS = 60_000;

export interface UseProfileProgressResult {
  loading: boolean;
  error: string | null;
  input: ProfileProgressInput | null;
  progress: ProfileProgressResult | null;
  recommendedAction: RecommendedAction | null;
  visibleRecommendedAction: RecommendedAction | null;
  skillClaims: SkillClaimDto[];
  verifiedSkillCount: number;
  declaredSkillCount: number;
  linkedinVerified: boolean;
  githubVerified: boolean;
  refresh: () => void;
  dismissRecommendedAction: () => void;
}

export function useProfileProgress(): UseProfileProgressResult {
  const [refreshToken, setRefreshToken] = useState(0);
  const [dismissTick, setDismissTick] = useState(0);

  const refresh = useCallback(() => {
    setRefreshToken((value) => value + 1);
  }, []);

  const queryOpts = { staleTime: PROFILE_STALE_MS };

  const onboardingQuery = useQuery({
    ...queryOpts,
    queryKey: [...queryKeys.myOnboarding(), refreshToken],
    queryFn: () => api.users.getOnboarding(),
  });
  const skillClaimsQuery = useQuery({
    ...queryOpts,
    queryKey: [...queryKeys.mySkillClaims(), refreshToken],
    queryFn: () => api.assessment.listSkillClaims(),
  });
  const educationQuery = useQuery({
    ...queryOpts,
    queryKey: [...queryKeys.myEducation(), refreshToken],
    queryFn: () => api.users.listEducation(),
  });
  const experiencesQuery = useQuery({
    ...queryOpts,
    queryKey: [...queryKeys.myWorkExperiences(), refreshToken],
    queryFn: () => api.users.listWorkExperiences(),
  });
  const languagesQuery = useQuery({
    ...queryOpts,
    queryKey: [...queryKeys.myLanguages(), refreshToken],
    queryFn: () => api.users.listLanguages(),
  });
  const projectsQuery = useQuery({
    ...queryOpts,
    queryKey: [...queryKeys.myProjects(), refreshToken],
    queryFn: () => api.projects.listMine().then((res) => res.projects ?? []),
  });
  const certificatesQuery = useQuery({
    ...queryOpts,
    queryKey: [...queryKeys.myCandidateCertificates(), refreshToken],
    queryFn: () => api.candidateCertificates.listMine().then((res) => res.certificates ?? []),
  });

  const queryResults = [
    onboardingQuery,
    skillClaimsQuery,
    educationQuery,
    experiencesQuery,
    languagesQuery,
    projectsQuery,
    certificatesQuery,
  ];

  const loading = queryResults.some((query) => query.isLoading);

  const onboarding = onboardingQuery.data ?? {
    profile: null,
    draft: null,
    onboardingCompleted: true,
  };
  const claims = skillClaimsQuery.data ?? [];
  const education = educationQuery.data ?? [];
  const experiences = experiencesQuery.data ?? [];
  const languages = languagesQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const certificates = certificatesQuery.data ?? [];

  const input: ProfileProgressInput | null = loading
    ? null
    : {
        skillClaims: claims,
        onboardingProfile: onboarding.profile,
        onboardingDraft: onboarding.draft,
        languages,
        education,
        experiences,
        projects,
        certificates,
      };

  const failureCount = queryResults.filter((query) => query.isError).length;

  const error =
    failureCount === 0
      ? null
      : failureCount === queryResults.length
        ? 'Could not load profile progress right now.'
        : 'Some profile details could not be loaded. Progress may be incomplete.';

  const progress = useMemo(() => (input ? computeProfileCompletion(input) : null), [input]);

  const rawRecommendedAction = useMemo(() => (input ? recommendNextAction(input) : null), [input]);

  const visibleRecommendedAction = useMemo(() => {
    void dismissTick;
    return input ? resolveVisibleRecommendedAction(input) : null;
  }, [input, dismissTick]);

  const dismissCurrentRecommendedAction = useCallback(() => {
    if (!visibleRecommendedAction) return;
    dismissRecommendedAction(visibleRecommendedAction.id);
    setDismissTick((value) => value + 1);
  }, [visibleRecommendedAction]);

  const verifiedSkillCount = claims.filter((claim) => claim.status === 'VERIFIED').length;
  const declaredSkillCount = claims.length;

  const linkedinVerified = Boolean(
    input?.onboardingProfile?.socialVerification?.linkedin?.verified ||
    input?.onboardingDraft?.socialVerification?.linkedin?.verified,
  );
  const githubVerified = Boolean(
    input?.onboardingProfile?.socialVerification?.github?.verified ||
    input?.onboardingDraft?.socialVerification?.github?.verified,
  );

  return {
    loading,
    error,
    input,
    progress,
    recommendedAction: rawRecommendedAction,
    visibleRecommendedAction,
    skillClaims: claims,
    verifiedSkillCount,
    declaredSkillCount,
    linkedinVerified,
    githubVerified,
    refresh,
    dismissRecommendedAction: dismissCurrentRecommendedAction,
  };
}
