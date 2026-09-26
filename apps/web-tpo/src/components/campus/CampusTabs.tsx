'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@smart/ui';

const TABS = [
  { href: '/campus/requests', label: 'Requests' },
  { href: '/campus/employers', label: 'Employers' },
] as const;

/** Sub-navigation for the Campus access section. */
export function CampusTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Campus access sections" className="flex gap-2 border-b border-zinc-200">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium',
              active
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
