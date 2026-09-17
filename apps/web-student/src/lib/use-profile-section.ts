'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';

import {
  DEFAULT_PROFILE_SECTION,
  isProfileSectionId,
  type ProfileSectionId,
} from '@/lib/profile-sections';

const LEGACY_HASH_TO_SECTION: Record<string, ProfileSectionId> = {
  about: 'about',
  skills: 'about',
  education: 'education',
  experience: 'experience',
  languages: 'languages',
  certificates: 'certifications',
  links: 'links',
  projects: 'projects',
  preferences: 'preferences',
  resume: 'resume',
};

export function useProfileSection() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const section = useMemo((): ProfileSectionId => {
    const raw = searchParams.get('section');
    if (isProfileSectionId(raw)) return raw;
    return DEFAULT_PROFILE_SECTION;
  }, [searchParams]);

  const setSection = useCallback(
    (id: ProfileSectionId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('section', id);
      router.push(`/profile?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    const raw = searchParams.get('section');
    if (!raw) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('section', DEFAULT_PROFILE_SECTION);
      router.replace(`/profile?${params.toString()}`, { scroll: false });
    }
  }, [router, searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace(/^#/u, '');
    if (!hash) return;
    const mapped = LEGACY_HASH_TO_SECTION[hash];
    if (mapped && searchParams.get('section') !== mapped) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('section', mapped);
      router.replace(`/profile?${params.toString()}`, { scroll: false });
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
    }
  }, [router, searchParams]);

  return { section, setSection };
}
