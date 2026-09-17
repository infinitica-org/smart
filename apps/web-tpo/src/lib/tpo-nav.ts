import {
  BarChart3,
  Briefcase,
  Building2,
  ClipboardList,
  Landmark,
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
        name: 'Create Job Posting',
        href: '/openings/create',
        description: 'Multi-step job posting wizard',
        icon: Briefcase,
      },
      {
        name: 'Listed Openings',
        href: '/openings',
        description: 'Search and manage current openings',
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
        name: 'Company Repository',
        href: '/companies',
        description: 'Recruiters and partners on campus',
        icon: Landmark,
      },
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
  { kind: 'link', name: 'Placement', href: '/companies', icon: Briefcase },
  { kind: 'link', name: 'Reports', href: '/reports', icon: BarChart3 },
  { kind: 'link', name: 'Settings', href: '/settings', icon: Settings },
];

/** Nav hrefs that must match exactly (sibling routes under the same prefix). */
const EXACT_MATCH_HREFS = new Set(['/openings', '/company']);

/**
 * `usePathname()` already strips query strings and hashes, so an opening-scoped
 * link such as `/suggestions?openingId=…` still resolves to its nav entry.
 */
export function isNavLinkActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/' || pathname === '/dashboard';
  if (EXACT_MATCH_HREFS.has(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Topbar Placement link — active on the repository landing and all placement shell routes. */
export function isPlacementTopNavActive(pathname: string): boolean {
  return pathname === '/companies' || isPlacementRoute(pathname);
}

export function isNavItemActive(pathname: string, item: TpoNavItem): boolean {
  return item.kind === 'group'
    ? item.children.some((child) => isNavLinkActive(pathname, child.href))
    : isNavLinkActive(pathname, item.href);
}

/** True on any placement workspace route, used to mount the placement shell. */
export function isPlacementRoute(pathname: string): boolean {
  return (
    pathname === '/companies' || PLACEMENT_NAV.some((link) => isNavLinkActive(pathname, link.href))
  );
}
