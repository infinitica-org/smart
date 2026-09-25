'use client';

import { useQuery } from '@tanstack/react-query';
import type { CompanyPortalAccount } from '@smart/contracts';
import { api } from './api';

export const COMPANY_ACCOUNT_QUERY_KEY = ['company', 'account'] as const;

export function useCompanyAccount() {
  return useQuery<CompanyPortalAccount>({
    queryKey: COMPANY_ACCOUNT_QUERY_KEY,
    // Never substitute a placeholder account on failure: errors and holds must surface
    // as errors, not as an approved company (S6-VV-139).
    queryFn: () => api.auth.companyAccount(),
    staleTime: 30_000,
    retry: 1,
  });
}
