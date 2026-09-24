'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, ChevronRight, LogOut, Menu, UserRound } from 'lucide-react';
import { useCurrentUser } from '@/lib/candidate-identity';
import { CandidateAvatar } from '@/components/profile/CandidateAvatar';
import { signOut } from '@/lib/auth';

type Breadcrumb = { label: string; href?: string };

function getStudentBreadcrumbs(pathname: string): Breadcrumb[] {
  if (pathname === '/' || pathname === '/dashboard') {
    return [{ label: 'Dashboard' }];
  }

  const segments = pathname.split('/').filter(Boolean);
  const crumbs: Breadcrumb[] = [];
  const first = segments[0] ?? '';

  if (first === 'jobs') crumbs.push({ label: 'Matches & Opportunities' });
  else if (first === 'profile') crumbs.push({ label: 'My Profile' });
  else if (first === 'skills') crumbs.push({ label: 'Skills' });
  else if (first === 'applications') crumbs.push({ label: 'Endorsement Tracking' });
  else if (first === 'assessments' || first === 'assessment') crumbs.push({ label: 'Assessments' });
  else if (first === 'interviews' || first === 'interview') crumbs.push({ label: 'Interviews' });
  else if (first === 'messages') crumbs.push({ label: 'Messages' });
  else {
    crumbs.push({
      label: first.charAt(0).toUpperCase() + first.slice(1).replace(/-/g, ' '),
    });
  }

  return crumbs;
}

export type StudentTopbarProps = {
  onOpenMobileNav: () => void;
};

export function StudentTopbar({ onOpenMobileNav }: StudentTopbarProps) {
  const router = useRouter();
  const { data: user } = useCurrentUser();
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

  const pathname = usePathname() || '/dashboard';
  const breadcrumbs = getStudentBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full shrink-0 items-center justify-between border-b border-zinc-200/80 bg-white px-6 font-sans antialiased select-none dark:border-zinc-800 dark:bg-[#111111]">
      <div className="flex h-full items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 lg:hidden"
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
                      className="font-medium text-zinc-500 hover:text-zinc-900 transition-colors truncate max-w-[120px] sm:max-w-none dark:text-zinc-400 dark:hover:text-white"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="font-semibold text-zinc-900 truncate max-w-[160px] sm:max-w-none dark:text-white">
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
        {/* 🔔 Notifications Bell Icon */}
        <button
          type="button"
          aria-label="View notifications"
          className="relative rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <Bell className="size-4" strokeWidth={1.75} />
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-zinc-900" />
        </button>

        {/* User Avatar Circle Dropdown */}
        <div ref={profileRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            aria-expanded={profileOpen}
            aria-label={`${user?.fullName ?? 'Candidate'} account menu`}
            className="flex items-center rounded-full transition-transform hover:scale-105 focus:outline-none"
          >
            <CandidateAvatar
              fullName={user?.fullName}
              profilePhotoUrl={user?.profilePhotoUrl}
              className="size-7 border border-zinc-900 bg-zinc-900 text-xs font-bold text-white shadow-2xs dark:border-zinc-700 dark:bg-zinc-800"
              fallbackClassName="bg-zinc-900 text-xs font-bold text-white"
            />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-[#161616]">
              <div className="border-b border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
                <p className="truncate text-xs font-bold text-zinc-900 dark:text-white">
                  {user?.fullName ?? 'Candidate'}
                </p>
                <p className="truncate text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  {user?.email ?? ''}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  router.push('/public-profile');
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <UserRound strokeWidth={1.75} className="size-4 text-zinc-500" />
                Public profile
              </button>

              <button
                type="button"
                onClick={() => void signOut()}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <LogOut strokeWidth={1.75} className="size-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
