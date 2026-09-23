'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronRight, GraduationCap, LogOut, Menu } from 'lucide-react';
import type { AuthenticatedUser } from '@smart/contracts';
import { api } from '../lib/api';
import { signOut } from '../lib/auth';

type Breadcrumb = { label: string; href?: string };

function getBreadcrumbs(pathname: string): Breadcrumb[] {
  if (pathname === '/' || pathname === '/dashboard') {
    return [{ label: 'Dashboard' }];
  }

  const segments = pathname.split('/').filter(Boolean);
  const crumbs: Breadcrumb[] = [];

  const first = segments[0] ?? '';
  if (['students', 'batches', 'whitelist', 'provisioning', 'onboarding'].includes(first)) {
    crumbs.push({ label: 'Candidates', href: '/students' });
    if (first === 'students') crumbs.push({ label: 'Students' });
    else if (first === 'batches') {
      if (segments.length > 1) {
        crumbs.push({ label: 'Batches', href: '/batches' });
        crumbs.push({ label: 'Batch Details' });
      } else {
        crumbs.push({ label: 'Batches' });
      }
    } else if (first === 'whitelist') crumbs.push({ label: 'Whitelist' });
    return crumbs;
  }

  if (
    ['openings', 'companies', 'opportunities', 'suggestions', 'review', 'company', 'ats'].includes(
      first,
    )
  ) {
    crumbs.push({ label: 'Placement', href: '/openings' });
    if (first === 'openings') {
      if (segments[1] === 'create') {
        crumbs.push({ label: 'Openings', href: '/openings' });
        crumbs.push({ label: 'Create Opening' });
      } else {
        crumbs.push({ label: 'Openings' });
      }
    } else if (first === 'companies') {
      if (segments.length > 1) {
        crumbs.push({ label: 'Companies', href: '/companies' });
        crumbs.push({ label: 'Company Profile' });
      } else {
        crumbs.push({ label: 'Companies' });
      }
    } else if (first === 'opportunities') crumbs.push({ label: 'Opportunities' });
    else if (first === 'suggestions') crumbs.push({ label: 'Suggestions' });
    else if (first === 'review') crumbs.push({ label: 'Review' });
    return crumbs;
  }

  if (first === 'reports') return [{ label: 'Reports & Analytics' }];
  if (first === 'calendar') return [{ label: 'Placement Calendar' }];
  if (first === 'settings') return [{ label: 'Settings' }];
  if (first === 'school-profile') return [{ label: 'School Profile' }];
  if (first === 'skill-verification') return [{ label: 'Skill Verification' }];
  if (first === 'work-experience-verification') return [{ label: 'Work Experience Verification' }];

  return segments.map((seg, i) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
    href: i < segments.length - 1 ? `/${segments.slice(0, i + 1).join('/')}` : undefined,
  }));
}

type TpoTopbarProps = {
  onOpenMobileNav: () => void;
};

export function TpoTopbar({ onOpenMobileNav }: TpoTopbarProps) {
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

  const pathname = usePathname() || '/';
  const breadcrumbs = getBreadcrumbs(pathname);

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

      <div className="flex items-center gap-4">
        {/* Support Link */}
        <Link
          href="/reports"
          className="text-[13px] font-medium text-zinc-800 hover:text-black transition-colors"
        >
          Support
        </Link>

        {/* User Avatar Circle */}
        <div ref={profileRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            aria-expanded={profileOpen}
            aria-label={`${user?.fullName ?? 'Pilot TPO'} account menu`}
            className="flex items-center rounded-full transition-transform hover:scale-105"
          >
            <div className="flex size-7 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-semibold text-white shadow-2xs">
              {(user?.fullName?.charAt(0) ?? 'P').toUpperCase()}
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-md border border-[var(--ds-border)] bg-[var(--ds-surface)] p-1 shadow-[var(--ds-card-shadow)]">
              <div className="border-b border-[var(--ds-border-subtle)] px-3 py-2.5">
                <p className="truncate text-xs font-semibold">{user?.fullName ?? 'Pilot TPO'}</p>
                <p className="truncate text-[11px] text-[var(--ds-text-muted)]">
                  {user?.email ?? 'tpo@institution.edu'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  router.push('/school-profile');
                }}
                className="flex w-full items-center gap-2 border-b rounded-sm px-3 py-3 text-xs font-medium transition-colors hover:bg-[var(--ds-surface-hover)]"
              >
                <GraduationCap strokeWidth={1.5} className="size-3.5" />
                My school
              </button>
              <button
                type="button"
                onClick={() => void signOut()}
                className="mt-1 flex w-full items-center gap-2 rounded-sm px-3 py-2 text-xs font-medium text-[var(--ds-coral)] hover:bg-[#fef4f4]"
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
