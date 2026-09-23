import type { ComponentType } from 'react';
import {
  LayoutDashboard,
  Building2,
  Building,
  Users,
  UserCheck,
  FileCheck2,
  ShieldCheck,
  History,
  Settings,
  UserPlus,
  Briefcase,
  BarChart3,
  GraduationCap,
  Award,
  FileText,
  Clock,
} from 'lucide-react';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'SYSTEM_ADMIN'
  | 'INSTITUTION_ADMIN'
  | 'TPO_ADMIN'
  | 'COMPANY_ADMIN'
  | 'RECRUITER'
  | 'STUDENT'
  | 'CANDIDATE';

export interface NavItemConfig {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string;
  exact?: boolean;
  subItems?: { name: string; href: string }[];
}

export interface RolePortalConfig {
  role: UserRole;
  portalName: string;
  kicker: string;
  homeUrl: string;
  navItems: NavItemConfig[];
}

export const SUPER_ADMIN_NAV: NavItemConfig[] = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, exact: true },
  { name: 'Institutions', href: '/admin/institutions', icon: Building2 },
  { name: 'Companies', href: '/admin/companies', icon: Building },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Platform Admins', href: '/admin/platform-admins', icon: UserCheck },
  { name: 'Rate Limits', href: '/admin/rate-limits', icon: Clock },
  { name: 'Integrity', href: '/admin/integrity', icon: ShieldCheck },
  { name: 'Audit Logs', href: '/admin/audit', icon: History },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export const INSTITUTION_TPO_NAV: NavItemConfig[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, exact: true },
  { name: 'Students', href: '/students', icon: Users },
  { name: 'Whitelist', href: '/whitelist', icon: UserPlus },
  { name: 'Employers', href: '/companies', icon: Building },
  { name: 'Placement Drives', href: '/openings', icon: Briefcase },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const COMPANY_NAV: NavItemConfig[] = [
  { name: 'Dashboard', href: '/company', icon: LayoutDashboard, exact: true },
  { name: 'Jobs & Drives', href: '/company/openings', icon: Briefcase },
  { name: 'Candidate Matches', href: '/company/candidates', icon: Users },
  { name: 'Applications', href: '/company/applications', icon: FileCheck2 },
  { name: 'Reports', href: '/company/reports', icon: BarChart3 },
  { name: 'Settings', href: '/company/settings', icon: Settings },
];

export const STUDENT_NAV: NavItemConfig[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
  { name: 'Profile', href: '/profile', icon: GraduationCap },
  { name: 'Jobs & Applications', href: '/jobs', icon: Briefcase },
  { name: 'Skill Verification', href: '/assessments', icon: FileText },
  { name: 'Interviews', href: '/interviews', icon: Users },
  { name: 'Certificates', href: '/certificates', icon: Award },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function getPortalConfigForRole(role: UserRole): RolePortalConfig {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'SYSTEM_ADMIN':
      return {
        role: 'SUPER_ADMIN',
        portalName: 'SMART Admin Console',
        kicker: 'Platform Control',
        homeUrl: '/admin',
        navItems: SUPER_ADMIN_NAV,
      };
    case 'INSTITUTION_ADMIN':
    case 'TPO_ADMIN':
      return {
        role: 'INSTITUTION_ADMIN',
        portalName: 'SMART Career Center',
        kicker: 'TPO Portal',
        homeUrl: '/',
        navItems: INSTITUTION_TPO_NAV,
      };
    case 'COMPANY_ADMIN':
    case 'RECRUITER':
      return {
        role: 'COMPANY_ADMIN',
        portalName: 'SMART Employer Hub',
        kicker: 'Talent Acquisition',
        homeUrl: '/company',
        navItems: COMPANY_NAV,
      };
    case 'STUDENT':
    case 'CANDIDATE':
    default:
      return {
        role: 'STUDENT',
        portalName: 'SMART Student Portal',
        kicker: 'Readiness & Credentials',
        homeUrl: '/dashboard',
        navItems: STUDENT_NAV,
      };
  }
}

export function isNavItemActive(pathname: string, item: NavItemConfig): boolean {
  if (item.exact) {
    return pathname === item.href;
  }
  if (item.subItems?.length) {
    return item.subItems.some(
      (sub) => pathname === sub.href || pathname.startsWith(`${sub.href}/`),
    );
  }
  return pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
}
