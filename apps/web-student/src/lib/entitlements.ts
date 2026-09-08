import { queryKeys } from '@smart/api-client';
import { useQuery } from '@smart/ui';
import { api } from './api';

/** The signed-in candidate's institution plan — resolved flags plus candidate capacity. */
export function useEntitlements() {
  return useQuery({
    queryKey: queryKeys.entitlements(),
    queryFn: () => api.onboarding.studentEntitlements(),
  });
}

/**
 * Whether a plan feature flag is enabled for the candidate's institution.
 * Defaults to `false` while entitlements are loading or on error, so a gated
 * feature never flashes on before quietly disappearing.
 */
export function useFeatureFlag(key: string): boolean {
  const { data } = useEntitlements();
  return data?.flags.some((flag) => flag.key === key && flag.enabled) ?? false;
}
