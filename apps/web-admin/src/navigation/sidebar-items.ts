import type { LucideIcon } from 'lucide-react';
import {
  BadgeCheck,
  Building2,
  CreditCard,
  GraduationCap,
  HeartPulse,
  LayoutDashboard,
  ScrollText,
  ShieldAlert,
  Users,
  Webhook,
  Gauge,
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
      { id: 'verification', title: 'Verification', url: '/admin/verification', icon: BadgeCheck },
      { id: 'plans', title: 'Pricing & flags', url: '/admin/plans', icon: CreditCard },
      { id: 'users', title: 'Student search', url: '/admin/users', icon: Users },
      { id: 'audit', title: 'Audit log', url: '/admin/audit', icon: ScrollText },
      { id: 'integrity', title: 'Integrity queue', url: '/admin/integrity', icon: ShieldAlert },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    items: [
      { id: 'health', title: 'Monitoring', url: '/admin/health', icon: HeartPulse },
      { id: 'rate-limits', title: 'Rate limits', url: '/admin/rate-limits', icon: Gauge },
      { id: 'webhooks', title: 'Webhooks', url: '/admin/webhooks', icon: Webhook },
    ],
  },
];
