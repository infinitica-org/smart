'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SkillClaimDto } from '@smart/contracts';
import { api } from '@/lib/api';
import { useOnboarding } from '@/lib/use-onboarding';
import {
  computeProfileCompletion,
  dismissRecommendedAction,
  recommendNextAction,
  resolveVisibleRecommendedAction,
  type ProfileProgressInput,
  type ProfileProgressResult,
  type RecommendedAction,
} from '@/lib/profile-progress';

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
  const {
    data: onboardingData,
    isLoading: onboardingLoading,
    isError: onboardingError,
  } = useOnboarding();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState<ProfileProgressInput | null>(null);
  const [skillClaims, setSkillClaims] = useState<SkillClaimDto[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [dismissTick, setDismissTick] = useState(0);

  const refresh = useCallback(() => {
    setRefreshToken((value) => value + 1);
  }, []);

  useEffect(() => {
    if (onboardingLoading) {
      setLoading(true);
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const [
        skillClaimsRes,
        educationRes,
        experiencesRes,
        languagesRes,
        projectsRes,
        certificatesRes,
      ] = await Promise.allSettled([
        api.assessment.listSkillClaims(),
        api.users.listEducation(),
        api.users.listWorkExperiences(),
        api.users.listLanguages(),
        api.projects.listMine(),
        api.candidateCertificates.listMine(),
      ]);

      if (cancelled) return;

      const onboarding = onboardingData ?? {
        profile: null,
        draft: null,
        onboardingCompleted: true,
      };
      const claims = skillClaimsRes.status === 'fulfilled' ? skillClaimsRes.value : [];
      const education = educationRes.status === 'fulfilled' ? educationRes.value : [];
      const experiences = experiencesRes.status === 'fulfilled' ? experiencesRes.value : [];
      const languages = languagesRes.status === 'fulfilled' ? languagesRes.value : [];
      const projects = projectsRes.status === 'fulfilled' ? (projectsRes.value.projects ?? []) : [];
      const certificates =
        certificatesRes.status === 'fulfilled' ? (certificatesRes.value.certificates ?? []) : [];

      const nextInput: ProfileProgressInput = {
        skillClaims: claims,
        onboardingProfile: onboarding.profile,
        onboardingDraft: onboarding.draft,
        languages,
        education,
        experiences,
        projects,
        certificates,
      };

      const failures = [
        onboardingError ? { status: 'rejected' as const } : null,
        skillClaimsRes,
        educationRes,
        experiencesRes,
        languagesRes,
        projectsRes,
        certificatesRes,
      ].filter((result) => result?.status === 'rejected');

      setInput(nextInput);
      setSkillClaims(claims);
      setError(
        failures.length === 7
          ? 'Could not load profile progress right now.'
          : failures.length > 0
            ? 'Some profile details could not be loaded. Progress may be incomplete.'
            : null,
      );
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [onboardingData, onboardingError, onboardingLoading, refreshToken]);

  const progress = useMemo(() => (input ? computeProfileCompletion(input) : null), [input]);

  const rawRecommendedAction = useMemo(() => (input ? recommendNextAction(input) : null), [input]);

  const visibleRecommendedAction = useMemo(() => {
    void dismissTick;
    return input ? resolveVisibleRecommendedAction(input) : null;
  }, [input, dismissTick]);

  const dismissCurrentRecommendedAction = useCallback(() => {
    if (!rawRecommendedAction) return;
    dismissRecommendedAction(rawRecommendedAction.id);
    setDismissTick((value) => value + 1);
  }, [rawRecommendedAction]);

  const verifiedSkillCount = skillClaims.filter((claim) => claim.status === 'VERIFIED').length;
  const declaredSkillCount = skillClaims.length;

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
    skillClaims,
    verifiedSkillCount,
    declaredSkillCount,
    linkedinVerified,
    githubVerified,
    refresh,
    dismissRecommendedAction: dismissCurrentRecommendedAction,
  };
}
