import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bot,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileLock,
  GraduationCap,
  HeartPulse,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  PenLine,
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
    items: [
      { id: 'dashboard', title: 'Overview', url: '/admin', icon: LayoutDashboard },
      { id: 'analytics', title: 'Analytics', url: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    id: 'queues',
    label: 'Tenants & Queues',
    items: [
      {
        id: 'institutions',
        title: 'Universities',
        url: '/admin/institutions',
        icon: GraduationCap,
      },
      { id: 'companies', title: 'Employers', url: '/admin/companies', icon: Building2 },
      {
        id: 'verification',
        title: 'Verification queue',
        url: '/admin/verification',
        icon: CheckCircle2,
      },
      {
        id: 'integrity',
        title: 'Trust & safety',
        url: '/admin/integrity',
        icon: ShieldAlert,
      },
    ],
  },
  {
    id: 'operations',
    label: 'Operations & Support',
    items: [
      { id: 'support', title: 'Support tool', url: '/admin/support', icon: HelpCircle },
      { id: 'users', title: 'Student search', url: '/admin/users', icon: Users },
      { id: 'audit', title: 'Audit log', url: '/admin/audit', icon: ScrollText },
      { id: 'sessions', title: 'Active sessions', url: '/admin/sessions', icon: LogOut },
      {
        id: 'data-requests',
        title: 'Data requests',
        url: '/admin/data-requests',
        icon: FileLock,
      },
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
        id: 'skill-disputes',
        title: 'Skill disputes',
        url: '/admin/skills/disputes',
        icon: ShieldAlert,
      },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    items: [
      {
        id: 'platform-admins',
        title: 'Admin users',
        url: '/admin/platform-admins',
        icon: UserCog,
      },
      { id: 'ai-governance', title: 'AI Governance', url: '/admin/ai-governance', icon: Bot },
      { id: 'health', title: 'Monitoring', url: '/admin/health', icon: HeartPulse },
    ],
  },
];
