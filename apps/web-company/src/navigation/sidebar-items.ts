import type { LucideIcon } from 'lucide-react';
import {
  Briefcase,
  Building2,
  LayoutDashboard,
  MessageSquare,
  UserCheck,
  Users,
} from 'lucide-react';

export type CompanyNavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  disabled?: boolean;
  badge?: string;
};

export const companyNavItems: CompanyNavItem[] = [
  { title: 'Home', url: '/', icon: LayoutDashboard },
  { title: 'Jobs', url: '/jobs', icon: Briefcase },
  { title: 'Applicants', url: '/applicants', icon: UserCheck },
  { title: 'Search students', url: '/students', icon: Users },
  { title: 'Messages', url: '/messages', icon: MessageSquare },
  { title: 'Company profile', url: '/company', icon: Building2 },
];
