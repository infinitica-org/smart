import type { LucideIcon } from 'lucide-react';
import {
  Briefcase,
  FileText,
  FolderKanban,
  GraduationCap,
  Languages,
  Link2,
  Shield,
  BadgeCheck,
  Sparkles,
} from 'lucide-react';

import type { ProfileAreaId } from '@/lib/profile-progress';

/** Stable query param values for /profile?section=… */
export const PROFILE_SECTION_IDS = [
  'education',
  'experience',
  'projects',
  'certifications',
  'credentials',
  'languages',
  'skills',
  'links',
  'resume',
] as const;

export type ProfileSectionId = (typeof PROFILE_SECTION_IDS)[number];

export function isProfileSectionId(value: string | null | undefined): value is ProfileSectionId {
  if (!value) return false;
  return (PROFILE_SECTION_IDS as readonly string[]).includes(value);
}

export function profileSectionHref(section: ProfileSectionId): string {
  return `/profile?section=${section}`;
}

/** Maps completion checklist areas to subsection URLs (not business logic). */
export const PROFILE_AREA_TO_SECTION: Record<ProfileAreaId, ProfileSectionId> = {
  skills: 'skills',
  languages: 'languages',
  education: 'education',
  experience: 'experience',
  projects: 'projects',
  certifications: 'certifications',
  professionalLinks: 'links',
};

export interface ProfileSectionNavItem {
  id: ProfileSectionId;
  label: string;
  /** Shorter copy for the profile top nav (accessible name stays `label`). */
  navLabel?: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface ProfileSectionNavGroup {
  groupLabel: string;
  items: ProfileSectionNavItem[];
}

export const PROFILE_SECTION_NAV: ProfileSectionNavGroup[] = [
  {
    groupLabel: 'Career',
    items: [
      {
        id: 'education',
        label: 'Education',
        icon: GraduationCap,
        title: 'Education',
        description: 'Add your academic background and supporting documents.',
      },
      {
        id: 'experience',
        label: 'Work Experience',
        navLabel: 'Experience',
        icon: Briefcase,
        title: 'Work Experience',
        description: 'Build your professional journey with evidence-backed experience.',
      },
      {
        id: 'projects',
        label: 'Projects',
        icon: FolderKanban,
        title: 'Projects',
        description: 'Submit projects with evidence for verification and your public profile.',
      },
    ],
  },
  {
    groupLabel: 'Credentials & skills',
    items: [
      {
        id: 'certifications',
        label: 'Certifications',
        icon: Shield,
        title: 'Certifications',
        description: 'Professional certifications and verified credentials on your profile.',
      },
      {
        id: 'credentials',
        label: 'Credentials',
        icon: BadgeCheck,
        title: 'Professional credentials',
        description:
          'Upload and verify professional licenses, IDs, and other credential documents.',
      },
      {
        id: 'languages',
        label: 'Languages',
        icon: Languages,
        title: 'Languages',
        description: 'Language proficiencies employers may look for.',
      },
      {
        id: 'skills',
        label: 'Skills',
        icon: Sparkles,
        title: 'Skills',
        description:
          'Select skills from the SMART catalog to assess and build verified credentials.',
      },
    ],
  },
  {
    groupLabel: 'Professional',
    items: [
      {
        id: 'links',
        label: 'Professional Links',
        navLabel: 'Links',
        icon: Link2,
        title: 'Professional Links',
        description: 'LinkedIn and GitHub help employers learn more about you.',
      },
    ],
  },
  {
    groupLabel: 'Documents',
    items: [
      {
        id: 'resume',
        label: 'Resume',
        icon: FileText,
        title: 'Resume',
        description: 'Upload your resume — SMART can parse it to help pre-fill profile details.',
      },
    ],
  },
];

const SECTION_BY_ID = new Map<ProfileSectionId, ProfileSectionNavItem>(
  PROFILE_SECTION_NAV.flatMap((group) => group.items.map((item) => [item.id, item])),
);

export function profileSectionMeta(id: ProfileSectionId): ProfileSectionNavItem {
  const item = SECTION_BY_ID.get(id);
  if (item) return item;
  const fallback = PROFILE_SECTION_NAV[0]?.items[0];
  return (
    fallback ?? {
      id: 'education',
      label: 'Education',
      icon: GraduationCap,
      title: 'Education',
      description: 'Add your academic background and supporting documents.',
    }
  );
}

export const DEFAULT_PROFILE_SECTION: ProfileSectionId = 'education';

/** Legacy ?section=about (and hash skills) map to a real subsection. */
export function resolveProfileSection(raw: string | null | undefined): ProfileSectionId {
  if (raw === 'about') return DEFAULT_PROFILE_SECTION;
  if (raw === 'skills') return 'skills';
  if (raw === 'preferences') return 'resume';
  if (isProfileSectionId(raw)) return raw;
  return DEFAULT_PROFILE_SECTION;
}
