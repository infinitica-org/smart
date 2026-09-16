import { useCallback } from 'react';
import { invalidationGroups, queryKeys } from '@smart/api-client';
import { useQuery, useQueryClient } from '@smart/ui';
import { api } from './api';

/** Shared onboarding draft/profile — one request serves every profile section. */
export function useOnboarding() {
  return useQuery({
    queryKey: queryKeys.onboarding(),
    queryFn: () => api.users.getOnboarding(),
    staleTime: 60_000,
  });
}

export function useInvalidateOnboarding() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    for (const queryKey of invalidationGroups.onOnboardingSaved()) {
      void queryClient.invalidateQueries({ queryKey });
    }
  }, [queryClient]);
}
