'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronRight, LogOut, Menu, ScrollText, UserCog } from 'lucide-react';
import type { AuthenticatedUser } from '@smart/contracts';
import { SearchDialog } from './search-dialog';

import { api } from '../lib/api';
import { signOut } from '../lib/auth';
import { sidebarItems } from '../navigation/sidebar-items';

type Breadcrumb = { label: string; href?: string };

function getAdminBreadcrumbs(pathname: string): Breadcrumb[] {
  if (pathname === '/admin' || pathname === '/admin/') {
    return [{ label: 'Admin Console' }];
  }

  const crumbs: Breadcrumb[] = [{ label: 'Admin', href: '/admin' }];

  for (const group of sidebarItems) {
    for (const item of group.items) {
      if (item.url !== '/admin' && (pathname === item.url || pathname.startsWith(`${item.url}/`))) {
        crumbs.push({ label: group.label });
        crumbs.push({ label: item.title, href: item.url });
        return crumbs;
      }
    }
  }

  const segments = pathname.replace('/admin', '').split('/').filter(Boolean);
  for (const seg of segments) {
    crumbs.push({
      label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
    });
  }

  return crumbs;
}

type AdminTopbarProps = {
  onOpenMobileNav: () => void;
};

export function AdminTopbar({ onOpenMobileNav }: AdminTopbarProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    api.auth
      .me()
      .then((res) => {
        if (!cancelled) setUser(res);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onOutsideClick(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  const pathname = usePathname() || '/admin';
  const breadcrumbs = getAdminBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full shrink-0 items-center justify-between border-b border-zinc-200/80 bg-white px-6 font-sans antialiased select-none">
      <div className="flex h-full items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 lg:hidden"
        >
          <Menu strokeWidth={1.5} className="size-5" />
        </button>

        {/* Dynamic Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center">
          <ol className="flex items-center gap-1.5 text-xs sm:text-[13px]">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <li key={crumb.label + idx} className="flex items-center gap-1.5">
                  {idx > 0 && (
                    <ChevronRight className="size-3.5 text-zinc-400 shrink-0" aria-hidden />
                  )}
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="font-medium text-zinc-500 hover:text-zinc-900 transition-colors truncate max-w-[120px] sm:max-w-none"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="font-semibold text-zinc-900 truncate max-w-[160px] sm:max-w-none">
                      {crumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <SearchDialog />

        {/* Audit Log Link */}
        <Link
          href="/admin/audit"
          className="text-[13px] font-medium text-zinc-800 hover:text-black transition-colors hidden sm:inline-block"
        >
          Audit Log
        </Link>

        {/* User Avatar Circle & Dropdown */}
        <div ref={profileRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            aria-expanded={profileOpen}
            aria-label={`${user?.fullName ?? 'Admin'} account menu`}
            className="flex items-center rounded-full transition-transform hover:scale-105"
          >
            <div className="flex size-7 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-semibold text-white shadow-2xs">
              {(user?.fullName?.charAt(0) ?? 'A').toUpperCase()}
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-md border border-[var(--ds-border,#e4e7ec)] bg-[var(--ds-surface,#ffffff)] p-1 shadow-[var(--ds-card-shadow)]">
              <div className="border-b border-[var(--ds-border-subtle,#eef1f4)] px-3 py-2.5">
                <p className="truncate text-xs font-semibold text-zinc-900">
                  {user?.fullName ?? 'Platform Admin'}
                </p>
                <p className="truncate text-[11px] text-[var(--ds-text-muted,#667085)]">
                  {user?.email ?? 'admin@smart.local'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  router.push('/admin/platform-admins');
                }}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-[var(--ds-surface-hover,#f8fafc)] hover:text-zinc-950"
              >
                <UserCog strokeWidth={1.5} className="size-3.5 text-zinc-500" />
                Admin users
              </button>

              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  router.push('/admin/audit');
                }}
                className="flex w-full items-center gap-2 border-b border-zinc-100 rounded-sm px-3 py-2.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-[var(--ds-surface-hover,#f8fafc)] hover:text-zinc-950"
              >
                <ScrollText strokeWidth={1.5} className="size-3.5 text-zinc-500" />
                Audit log
              </button>

              <button
                type="button"
                onClick={() => void signOut()}
                className="mt-1 flex w-full items-center gap-2 rounded-sm px-3 py-2 text-xs font-medium text-[var(--ds-coral,#e5484d)] hover:bg-[#fef4f4]"
              >
                <LogOut strokeWidth={1.5} className="size-3.5" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
