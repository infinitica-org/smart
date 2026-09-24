'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  ChevronRight,
  LogOut,
  Menu,
  Building2,
  Settings,
  UserRound,
  Search,
} from 'lucide-react';
import { useCompanyAccount } from '@/lib/use-company-account';
import { signOut } from '@/lib/auth';

type Breadcrumb = { label: string; href?: string };

function getCompanyBreadcrumbs(pathname: string): Breadcrumb[] {
  if (pathname === '/' || pathname === '/overview') {
    return [{ label: 'Overview' }];
  }

  const segments = pathname.split('/').filter(Boolean);
  const crumbs: Breadcrumb[] = [{ label: 'Home', href: '/' }];
  const first = segments[0] ?? '';

  if (first === 'jobs') {
    crumbs.push({ label: 'Job Openings', href: '/jobs' });
    if (segments[1] === 'new') crumbs.push({ label: 'Post a Job' });
    else if (segments[2] === 'edit') crumbs.push({ label: 'Edit Job' });
  } else if (first === 'applicants') {
    crumbs.push({ label: 'Applicants & Pipeline', href: '/applicants' });
  } else if (first === 'students' || first === 'candidates') {
    crumbs.push({ label: 'Search Candidates', href: '/students' });
  } else if (first === 'messages') {
    crumbs.push({ label: 'Messages', href: '/messages' });
  } else if (first === 'analytics') {
    crumbs.push({ label: 'Hiring Analytics', href: '/analytics' });
  } else if (first === 'team') {
    crumbs.push({ label: 'Teammates', href: '/team' });
  } else if (first === 'company' || first === 'profile') {
    crumbs.push({ label: 'Company Profile', href: '/company' });
  } else if (first === 'reviews') {
    crumbs.push({ label: 'Reviews', href: '/reviews' });
  } else if (first === 'billing') {
    crumbs.push({ label: 'Billing & Plan', href: '/billing' });
  } else if (first === 'settings') {
    crumbs.push({ label: 'Settings', href: '/settings' });
  } else {
    crumbs.push({
      label: first.charAt(0).toUpperCase() + first.slice(1).replace(/-/g, ' '),
    });
  }

  return crumbs;
}

export type CompanyTopbarProps = {
  onOpenMobileNav?: () => void;
};

export function CompanyTopbar({ onOpenMobileNav }: CompanyTopbarProps) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const { data: account } = useCompanyAccount();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutsideClick(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  const breadcrumbs = getCompanyBreadcrumbs(pathname);
  const companyName = account?.companyName || 'Employer Partner';
  const _representativeName = account?.fullName || 'Representative';
  const userInitial = (account?.companyName || account?.fullName || 'E').charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full shrink-0 items-center justify-between border-b border-zinc-200/80 bg-white/90 px-4 backdrop-blur font-sans antialiased select-none md:px-6">
      {/* Left: Mobile Trigger & Breadcrumbs */}
      <div className="flex h-full items-center gap-3">
        {onOpenMobileNav ? (
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Open navigation menu"
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 lg:hidden"
          >
            <Menu strokeWidth={1.75} className="size-5" />
          </button>
        ) : null}

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

      {/* Right: Quick Search, Notifications & Account Dropdown */}
      <div className="flex items-center gap-3">
        {/* Quick Talent Search Button */}
        <Link
          href="/students"
          className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
        >
          <Search className="size-3.5 text-zinc-400" />
          <span>Search candidates...</span>
        </Link>

        {/* 🔔 Notifications Bell Icon */}
        <button
          type="button"
          aria-label="View notifications"
          className="relative rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100"
        >
          <Bell className="size-4" strokeWidth={1.75} />
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-emerald-500 ring-2 ring-white" />
        </button>

        {/* Employer User Avatar Circle Dropdown */}
        <div ref={profileRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            aria-expanded={profileOpen}
            aria-label={`${companyName} account menu`}
            className="flex items-center gap-2 rounded-full transition-transform hover:scale-105 focus:outline-none"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white shadow-2xs">
              {userInitial}
            </span>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl animate-fadeIn">
              <div className="border-b border-zinc-100 px-3 py-2.5">
                <p className="truncate text-xs font-bold text-zinc-900">{companyName}</p>
                <p className="truncate text-[11px] font-medium text-zinc-500">
                  {account?.email ?? ''}
                </p>
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  Verified Employer
                </span>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    router.push('/company');
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                >
                  <Building2 strokeWidth={1.75} className="size-4 text-zinc-500" />
                  Company Profile
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    router.push('/team');
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                >
                  <UserRound strokeWidth={1.75} className="size-4 text-zinc-500" />
                  Teammates
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    router.push('/settings');
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                >
                  <Settings strokeWidth={1.75} className="size-4 text-zinc-500" />
                  Portal Settings
                </button>
              </div>

              <div className="border-t border-zinc-100 pt-1">
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
                >
                  <LogOut strokeWidth={1.75} className="size-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
