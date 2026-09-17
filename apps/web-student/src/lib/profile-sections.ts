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
  SlidersHorizontal,
  UserRound,
} from 'lucide-react';

import type { ProfileAreaId } from '@/lib/profile-progress';

/** Stable query param values for /profile?section=… */
export const PROFILE_SECTION_IDS = [
  'about',
  'experience',
  'projects',
  'education',
  'certifications',
  'credentials',
  'languages',
  'links',
  'preferences',
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
  skills: 'about',
  languages: 'languages',
  education: 'education',
  experience: 'experience',
  projects: 'projects',
  certifications: 'certifications',
  professionalLinks: 'links',
  jobPreferences: 'preferences',
};

export interface ProfileSectionNavItem {
  id: ProfileSectionId;
  label: string;
  icon: LucideIcon;
  /** Page title when this subsection is active (except About uses custom copy). */
  title: string;
  description: string;
}

export interface ProfileSectionNavGroup {
  groupLabel: string;
  items: ProfileSectionNavItem[];
}

export const PROFILE_SECTION_NAV: ProfileSectionNavGroup[] = [
  {
    groupLabel: 'Profile',
    items: [
      {
        id: 'about',
        label: 'About',
        icon: UserRound,
        title: 'About You',
        description:
          'Introduce yourself with a short professional summary. This helps employers understand you better.',
      },
    ],
  },
  {
    groupLabel: 'Career',
    items: [
      {
        id: 'experience',
        label: 'Work Experience',
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
    groupLabel: 'Education',
    items: [
      {
        id: 'education',
        label: 'Education',
        icon: GraduationCap,
        title: 'Education',
        description: 'Add your academic background and supporting documents.',
      },
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
    ],
  },
  {
    groupLabel: 'Professional',
    items: [
      {
        id: 'links',
        label: 'Professional Links',
        icon: Link2,
        title: 'Professional Links',
        description: 'LinkedIn and GitHub help employers learn more about you.',
      },
      {
        id: 'preferences',
        label: 'Job Preferences',
        icon: SlidersHorizontal,
        title: 'Job Preferences',
        description: 'Tell SMART where and how you want to work.',
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
  const aboutDefault = PROFILE_SECTION_NAV[0]?.items[0];
  return (
    aboutDefault ?? {
      id: 'about',
      label: 'About',
      icon: UserRound,
      title: 'About You',
      description:
        'Introduce yourself with a short professional summary. This helps employers understand you better.',
    }
  );
}

export const DEFAULT_PROFILE_SECTION: ProfileSectionId = 'about';
