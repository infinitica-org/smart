import {
  BarChart3,
  Briefcase,
  Building2,
  ClipboardList,
  Columns3,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  UserPlus,
  UserSearch,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface TpoNavLink {
  name: string;
  href: string;
  description: string;
  icon: LucideIcon;
}

export interface TpoNavGroup {
  groupLabel: string;
  items: TpoNavLink[];
}

export type TpoNavItem =
  | { kind: 'link'; name: string; href: string; icon: LucideIcon; isNew?: boolean }
  | { kind: 'group'; name: string; icon: LucideIcon; children: TpoNavLink[] };

/**
 * Placement workspace navigation. Grouped for the placement sidebar; the flat
 * `PLACEMENT_NAV` projection below backs the global topbar so both surfaces
 * share one source of truth.
 */
export const PLACEMENT_NAV_GROUPS: TpoNavGroup[] = [
  {
    groupLabel: 'Job Management',
    items: [
      {
        name: 'Openings',
        href: '/openings',
        description: 'Create and manage job openings',
        icon: Briefcase,
      },
    ],
  },
  {
    groupLabel: 'Candidate Discovery',
    items: [
      {
        name: 'Suggestions',
        href: '/suggestions',
        description: 'Review ranked candidates',
        icon: UserSearch,
      },
      {
        name: 'Opportunities',
        href: '/opportunities',
        description: 'View placement applications',
        icon: ClipboardList,
      },
    ],
  },
  {
    groupLabel: 'Pipeline',
    items: [
      {
        name: 'ATS',
        href: '/ats',
        description: 'Manage candidate pipeline',
        icon: Columns3,
      },
      {
        name: 'Review',
        href: '/review',
        description: 'Review candidates before sending to company',
        icon: ShieldCheck,
      },
    ],
  },
  {
    groupLabel: 'Company',
    items: [
      {
        name: 'Company Dashboard',
        href: '/company',
        description: 'View placement pipeline overview',
        icon: Building2,
      },
    ],
  },
];

export const PLACEMENT_NAV: TpoNavLink[] = PLACEMENT_NAV_GROUPS.flatMap((group) => group.items);

export const TPO_NAV: TpoNavItem[] = [
  { kind: 'link', name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { kind: 'link', name: 'Candidates', href: '/students', icon: Users },
  { kind: 'link', name: 'Onboarding', href: '/provisioning', icon: UserPlus },
  { kind: 'group', name: 'Placement', icon: Briefcase, children: PLACEMENT_NAV },
  { kind: 'link', name: 'Reports', href: '/reports', icon: BarChart3 },
  { kind: 'link', name: 'Settings', href: '/settings', icon: Settings },
];

/**
 * `usePathname()` already strips query strings and hashes, so an opening-scoped
 * link such as `/suggestions?openingId=…` still resolves to its nav entry.
 */
export function isNavLinkActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/' || pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isNavItemActive(pathname: string, item: TpoNavItem): boolean {
  return item.kind === 'group'
    ? item.children.some((child) => isNavLinkActive(pathname, child.href))
    : isNavLinkActive(pathname, item.href);
}

/** True on any of the six placement routes, used to mount the placement shell. */
export function isPlacementRoute(pathname: string): boolean {
  return PLACEMENT_NAV.some((link) => isNavLinkActive(pathname, link.href));
}
