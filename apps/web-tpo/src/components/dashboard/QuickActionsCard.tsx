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
  dashboardSectionSubtitleClass,
  dashboardSectionTitleClass,
} from '../../lib/tpo-dashboard-ui';

const QUICK_ACTIONS: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconClass: string;
}[] = [
  {
    href: '/provisioning',
    title: 'Onboard Candidates',
    description: 'Add new candidates to the platform',
    icon: UserPlus,
    iconClass: 'bg-[#eff6ff] text-[#2563eb]',
  },
  {
    href: '/openings',
    title: 'Manage Openings',
    description: 'Review and manage job openings',
    icon: Briefcase,
    iconClass: 'bg-[#ecfdf5] text-[#059669]',
  },
  {
    href: '/reports',
    title: 'View Reports',
    description: 'Export cohort telemetry reports',
    icon: BarChart3,
    iconClass: 'bg-[#f5f3ff] text-[#7c3aed]',
  },
  {
    href: '/settings',
    title: 'Platform Settings',
    description: 'Institution profile and entitlements',
    icon: Settings,
    iconClass: 'bg-[#fff7ed] text-[#ea580c]',
  },
];

export function QuickActionsCard() {
  return (
    <section className={`${bentoCardClass} lg:col-span-4`}>
      <h2 className={dashboardSectionTitleClass}>Quick Actions</h2>
      <p className={dashboardSectionSubtitleClass}>Common tasks to manage your placement drive</p>
      <ul className="mt-4 space-y-1">
        {QUICK_ACTIONS.map((action) => (
          <li key={action.href}>
            <Link
              href={action.href}
              className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-[var(--ds-surface-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-text)]"
            >
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${action.iconClass}`}
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
                className="size-4 shrink-0 text-[var(--ds-text-subtle)] transition-transform group-hover:translate-x-0.5"
                strokeWidth={1.5}
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
