'use client';

import { useQuery } from '@smart/ui';
import { api } from '@/lib/api';

export const STUDENT_DASHBOARD_QUERY_KEY = ['me', 'dashboard'] as const;

/** One authorised read model for the whole dashboard, instead of seven client-side calculations. */
export function useStudentDashboard() {
  return useQuery({
    queryKey: STUDENT_DASHBOARD_QUERY_KEY,
    queryFn: () => api.users.getDashboard(),
    staleTime: 30_000,
  });
}
