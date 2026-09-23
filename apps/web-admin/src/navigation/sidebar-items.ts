import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  ClipboardList,
  CreditCard,
  GraduationCap,
  HeartPulse,
  LayoutDashboard,
  PenLine,
  RefreshCw,
  ScrollText,
  ShieldAlert,
  ShieldBan,
  UserCog,
  Users,
} from 'lucide-react';

export interface NavItem {
  id: string;
  title: string;
  url: string;
  icon: LucideIcon;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [{ id: 'dashboard', title: 'Dashboard', url: '/admin', icon: LayoutDashboard }],
  },
  {
    id: 'tenants',
    label: 'Tenants',
    items: [
      {
        id: 'institutions',
        title: 'Institutions',
        url: '/admin/institutions',
        icon: GraduationCap,
      },
      { id: 'companies', title: 'Companies', url: '/admin/companies', icon: Building2 },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { id: 'plans', title: 'Pricing & flags', url: '/admin/plans', icon: CreditCard },
      { id: 'users', title: 'Student search', url: '/admin/users', icon: Users },
      { id: 'audit', title: 'Audit log', url: '/admin/audit', icon: ScrollText },
      { id: 'integrity', title: 'Integrity queue', url: '/admin/integrity', icon: ShieldAlert },
      {
        id: 'project-review',
        title: 'Project review',
        url: '/admin/project-review',
        icon: ClipboardList,
      },
      {
        id: 'blocked-words',
        title: 'Blocked words',
        url: '/admin/blocked-words',
        icon: ShieldBan,
      },
      {
        id: 'assessments',
        title: 'Assessments',
        url: '/admin/assessments',
        icon: ClipboardList,
      },
      {
        id: 'grading-queue',
        title: 'Grading queue',
        url: '/admin/grading-queue',
        icon: PenLine,
      },
      {
        id: 'skill-retake',
        title: 'Skill retake policies',
        url: '/admin/skills',
        icon: RefreshCw,
      },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    items: [
      {
        id: 'platform-admins',
        title: 'Platform admins',
        url: '/admin/platform-admins',
        icon: UserCog,
      },
      { id: 'health', title: 'Monitoring', url: '/admin/health', icon: HeartPulse },
      // Rate limits / Webhooks are unfinished scaffolds (no data, no backing writes) —
      // intentionally hidden from nav until they're built out. See admin/rate-limits
      // and admin/webhooks pages, and the webhooks controller's `_meta` scaffold route.
    ],
  },
];
