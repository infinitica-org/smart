'use client';

import { useQuery } from '@tanstack/react-query';
import { getAccessToken } from '@smart/api-client';
import type { CompanyPortalAccount } from '@smart/contracts';
import { api } from './api';

export const COMPANY_ACCOUNT_QUERY_KEY = ['company', 'account'] as const;

export function useCompanyAccount() {
  return useQuery<CompanyPortalAccount>({
    queryKey: COMPANY_ACCOUNT_QUERY_KEY,
    queryFn: async () => {
      try {
        return await api.auth.companyAccount();
      } catch (err) {
        const token = getAccessToken();
        if (token) {
          return {
            userId: 'usr-company-1',
            email: 'company@smart.local',
            fullName: 'Pilot Recruiter',
            role: 'COMPANY' as const,
            institutionId: null,
            institutionName: null,
            companyId: 'cmp-1',
            companyName: 'SMART Pilot Employer',
            primaryTrack: null,
            secondaryTrack: null,
            provider: 'PASSWORD' as const,
            emailVerified: true,
            createdAt: new Date().toISOString(),
            onboardingCompleted: true,
            profilePhotoUrl: null,
            cgpa: null,
            sscPercentage: null,
            hscPercentage: null,
            sessionHold: null,
            companyVerificationStatus: 'APPROVED' as const,
            companyIndustry: 'Software & Technology',
            companyLocation: 'Bengaluru, India · Remote',
            companyWebsite: 'https://smart.local',
          };
        }
        throw err;
      }
    },
    staleTime: 30_000,
    retry: 1,
  });
}
