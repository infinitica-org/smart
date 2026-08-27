'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn, SignOutButton } from '@smart/ui';
import { signOut } from '../lib/auth';

const NAV_ITEMS = [
  { label: 'Platform Health', href: '/admin/health' },
  { label: 'Institutions', href: '/admin/institutions' },
  { label: 'Integrity Queue', href: '/admin/integrity' },
  { label: 'User Directory', href: '/admin/users' },
  { label: 'Rate Limits', href: '/admin/rate-limits' },
  { label: 'Webhook Outbox', href: '/admin/webhooks' },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-[var(--surface-border)] bg-[var(--surface)] flex flex-col min-h-dvh flex-shrink-0">
      <div className="p-6 border-b border-[var(--surface-border)]">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          SMART Console
        </span>
        <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
          System Admin
        </h2>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-1" aria-label="Sidebar Admin Navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'block px-3 py-2 rounded-lg text-sm transition-all focus-visible:outline focus-visible:outline-2',
                isActive
                  ? 'bg-brand-50 text-brand-700 font-medium dark:bg-brand-950/20 dark:text-brand-400'
                  : 'text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-[var(--surface-border)]">
        <SignOutButton onSignOut={signOut} className="w-full justify-start" />
      </div>
    </aside>
  );
}
