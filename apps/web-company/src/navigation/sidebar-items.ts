import type { LucideIcon } from 'lucide-react';
import { Briefcase, Building2, LayoutDashboard, Settings, Users } from 'lucide-react';

export type CompanyNavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  disabled?: boolean;
  badge?: string;
};

export const companyNavItems: CompanyNavItem[] = [
  { title: 'Overview', url: '/', icon: LayoutDashboard },
  { title: 'Company profile', url: '/profile', icon: Building2 },
  { title: 'Jobs', url: '/jobs', icon: Briefcase, disabled: true, badge: 'Soon' },
  { title: 'Candidates', url: '/candidates', icon: Users, disabled: true, badge: 'Soon' },
  { title: 'Settings', url: '/settings', icon: Settings },
];
