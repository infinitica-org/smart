'use client';

import { useQuery } from '@smart/ui';
import { api } from '@/lib/api';

export const STUDENT_READINESS_QUERY_KEY = ['me', 'readiness'] as const;

/**
 * One authorised read model for the whole readiness view. It is recalculated by the API on every
 * read, so it is always refetched when the page opens or regains focus: evidence added elsewhere
 * shows up immediately instead of after a cache window.
 */
export function useStudentReadiness() {
  return useQuery({
    queryKey: STUDENT_READINESS_QUERY_KEY,
    queryFn: () => api.users.getReadiness(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}
