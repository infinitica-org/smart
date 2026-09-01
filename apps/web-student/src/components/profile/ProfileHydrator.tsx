'use client';

import { useEffect } from 'react';
import { api } from '@/lib/api';
import { useProfileStore } from '@/lib/stores/profile-store';
import { useRouter } from 'next/navigation';

export function ProfileHydrator() {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    void api.users
      .getProfile()
      .then((response) => {
        if (!cancelled) {
          useProfileStore.getState().hydrate(response.profile);
          console.log('[ProfileHydrator] Profile fetched:', response.profile);
          const p = response.profile;
          const isComplete =
            p.dpdpConsent &&
            p.basicInfo?.firstName &&
            p.basicInfo?.lastName &&
            p.basicInfo?.phoneNumber &&
            p.basicInfo?.linkedinUrl &&
            p.skills?.some((s: any) => s.type === 'language') &&
            p.preferences?.length > 0;
          console.log(
            '[ProfileHydrator] isComplete:',
            isComplete,
            'dpdpConsent:',
            p.dpdpConsent,
            'firstName:',
            p.basicInfo?.firstName,
          );
          if (!isComplete) {
            console.log(
              '[ProfileHydrator] Redirecting to /onboarding because profile is incomplete',
            );
            router.push('/onboarding');
          }
        }
      })
      .catch((e) => {
        console.error('[ProfileHydrator] Fetch failed', e);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
