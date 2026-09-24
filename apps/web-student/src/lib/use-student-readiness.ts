'use client';

import { useQuery } from '@smart/ui';
import { api } from '@/lib/api';

export const STUDENT_READINESS_QUERY_KEY = ['me', 'readiness'] as const;

/** One authorised read model for the whole readiness view. */
export function useStudentReadiness() {
  return useQuery({
    queryKey: STUDENT_READINESS_QUERY_KEY,
    queryFn: () => api.users.getReadiness(),
    staleTime: 30_000,
  });
}
