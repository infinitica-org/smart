'use client';

import { queryKeys } from '@smart/api-client';
import { useQuery } from '@smart/ui';
import { api } from '@/lib/api';

/** Shared onboarding payload — dedupes parallel profile-section fetches. */
export function useOnboarding() {
  return useQuery({
    queryKey: queryKeys.myOnboarding(),
    queryFn: () => api.users.getOnboarding(),
    staleTime: 60_000,
  });
}
