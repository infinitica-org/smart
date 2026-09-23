'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export const COMPANY_ACCOUNT_QUERY_KEY = ['company', 'account'] as const;

export function useCompanyAccount() {
  return useQuery({
    queryKey: COMPANY_ACCOUNT_QUERY_KEY,
    queryFn: () => api.auth.companyAccount(),
    staleTime: 30_000,
  });
}
