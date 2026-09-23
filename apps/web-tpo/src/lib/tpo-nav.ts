import {
  BarChart3,
  Briefcase,
  ClipboardList,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
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
 * Placement workspace navigation. Grouped labels for documentation; the flat
 * `PLACEMENT_NAV` projection backs the placement pill row under the global topbar.
 */
export const PLACEMENT_NAV_GROUPS: TpoNavGroup[] = [
  {
    groupLabel: 'Company',
    items: [
      {
        name: 'Company Repository',
        href: '/companies',
        description: 'Employer profiles, history, and openings',
        icon: Landmark,
      },
      // WIP: Company Dashboard is hidden from the sidebar for now while the
      // feature is still being finished. Re-enable this entry once it's
      // ready to ship.
      // {
      //   name: 'Company Dashboard',
      //   href: '/company',
      //   description: 'Placement pipeline overview',
      //   icon: Building2,
      // },
    ],
  },
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
        name: 'Applications',
        href: '/opportunities',
        description: 'View placement applications',
        icon: ClipboardList,
      },
    ],
  },
  {
    groupLabel: 'Pipeline',
    items: [
      // WIP: ATS (candidate pipeline board) is hidden from the sidebar for
      // now while the feature is still being finished. Re-enable this entry
      // once it's ready to ship.
      // {
      //   name: 'ATS',
      //   href: '/ats',
      //   description: 'Manage candidate pipeline',
      //   icon: Columns3,
      // },
      {
        name: 'Review',
        href: '/review',
        description: 'Review candidates before sending to company',
        icon: ShieldCheck,
      },
    ],
  },
];

export const PLACEMENT_NAV: TpoNavLink[] = PLACEMENT_NAV_GROUPS.flatMap((group) => group.items);

/** Candidates workspace — pill row under the global topbar (URLs unchanged). */
export const CANDIDATES_NAV_GROUPS: TpoNavGroup[] = [
  {
    groupLabel: 'Workspace',
    items: [
      {
        name: 'Students',
        href: '/students',
        description: 'Search and review whitelisted students',
        icon: Users,
      },
      {
        name: 'Batches',
        href: '/batches',
        description: 'Group students into cohorts for filtering',
        icon: LayoutGrid,
      },
    ],
  },
];

export const CANDIDATES_NAV: TpoNavLink[] = CANDIDATES_NAV_GROUPS.flatMap((group) => group.items);

/** Primary topbar — university wireframe IA */
export const TPO_NAV: TpoNavItem[] = [
  { kind: 'link', name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { kind: 'link', name: 'Students', href: '/students', icon: Users },
  { kind: 'link', name: 'Whitelist', href: '/whitelist', icon: UserPlus },
  { kind: 'link', name: 'Employers', href: '/companies', icon: Briefcase },
  { kind: 'link', name: 'Reports', href: '/reports', icon: BarChart3 },
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

/** Topbar Candidates link — active on repository and onboarding routes. */
export function isCandidatesTopNavActive(pathname: string): boolean {
  return isCandidatesRoute(pathname);
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

/** True on candidates workspace routes (repository or onboarding). */
export function isCandidatesRoute(pathname: string): boolean {
  return CANDIDATES_NAV.some((link) => isNavLinkActive(pathname, link.href));
}

/** Topbar Students — roster and batch routes. */
export function isStudentsTopNavActive(pathname: string): boolean {
  return (
    isNavLinkActive(pathname, '/students') ||
    isNavLinkActive(pathname, '/batches') ||
    pathname.startsWith('/work-experience-verification') ||
    pathname.startsWith('/skill-verification')
  );
}

/** Topbar Whitelist — hub, onboarding, and legacy provisioning URL. */
export function isWhitelistTopNavActive(pathname: string): boolean {
  return (
    isNavLinkActive(pathname, '/whitelist') ||
    isNavLinkActive(pathname, '/onboarding') ||
    isNavLinkActive(pathname, '/provisioning')
  );
}
