import Link from 'next/link';
import {
  BarChart3,
  Briefcase,
  ChevronRight,
  Settings,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import {
  bentoCardClass,
  dashboardAccentStyles,
  dashboardQuickActionHoverClass,
  dashboardSectionSubtitleClass,
  dashboardSectionTitleClass,
  type DashboardAccentKey,
} from '../../lib/tpo-dashboard-ui';

const QUICK_ACTIONS: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: DashboardAccentKey;
}[] = [
  {
    href: '/provisioning',
    title: 'Onboard Candidates',
    description: 'Add new candidates to the platform',
    icon: UserPlus,
    accent: 'blue',
  },
  {
    href: '/openings',
    title: 'Manage Openings',
    description: 'Review and manage job openings',
    icon: Briefcase,
    accent: 'mint',
  },
  {
    href: '/reports',
    title: 'View Reports',
    description: 'Export cohort telemetry reports',
    icon: BarChart3,
    accent: 'lavender',
  },
  {
    href: '/settings',
    title: 'Platform Settings',
    description: 'Institution profile and entitlements',
    icon: Settings,
    accent: 'amber',
  },
];

export function QuickActionsCard() {
  return (
    <section className={`${bentoCardClass} lg:col-span-4`}>
      <h2 className={dashboardSectionTitleClass}>Quick Actions</h2>
      <p className={dashboardSectionSubtitleClass}>Common tasks to manage your placement drive</p>
      <ul className="mt-4 space-y-0.5">
        {QUICK_ACTIONS.map((action) => (
          <li key={action.href}>
            <Link href={action.href} className={dashboardQuickActionHoverClass}>
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${dashboardAccentStyles[action.accent].iconWrap}`}
              >
                <action.icon className="size-[18px]" strokeWidth={1.5} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-[var(--ds-text)]">
                  {action.title}
                </span>
                <span className="block truncate text-[12px] text-[var(--ds-text-muted)]">
                  {action.description}
                </span>
              </span>
              <ChevronRight
                className="size-4 shrink-0 text-[var(--ds-text-subtle)] transition-transform duration-200 group-hover:translate-x-0.5"
                strokeWidth={1.5}
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
