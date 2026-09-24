'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Menu } from 'lucide-react';
import { CompanySidebar } from './company-sidebar';

export { CompanySidebar };

const CRUMBS: Record<string, string> = {
  jobs: 'Jobs',
  applicants: 'Applicants',
  students: 'Search candidates',
  messages: 'Messages',
  company: 'Company profile',
  team: 'Teammates',
  reviews: 'Reviews',
  analytics: 'Hiring analytics',
  billing: 'Billing',
  new: 'Post a job',
  edit: 'Edit job',
};

import { getCurrentUser, signOut } from '../lib/auth';

function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const pathname = usePathname() || '/';
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<{ email?: string; role?: string; companyName?: string } | null>(
    null,
  );
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        if (res) {
          setUser({
            email: res.email,
            role: res.role,
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const segments = pathname.split('/').filter(Boolean);
  const crumbs =
    segments.length === 0
      ? [{ label: 'Home', href: undefined as string | undefined }]
      : segments
          .filter((seg, i) => !(i > 0 && seg.length > 0 && !CRUMBS[seg]))
          .map((seg, i, all) => ({
            label: CRUMBS[seg] ?? seg,
            href:
              i < all.length - 1
                ? `/${segments.slice(0, segments.indexOf(seg) + 1).join('/')}`
                : undefined,
          }));

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'E';
  const userEmail = user?.email ?? 'recruiter@company.com';

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full shrink-0 items-center justify-between border-b border-zinc-200/80 bg-white px-6 select-none">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 lg:hidden"
        >
          <Menu strokeWidth={1.5} className="size-5" />
        </button>
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-[13px]">
            {crumbs.map((crumb, idx) => (
              <li key={crumb.label + idx} className="flex items-center gap-1.5">
                {idx > 0 ? <ChevronRight className="size-3.5 text-zinc-400" aria-hidden /> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="font-medium text-zinc-500 hover:text-zinc-900">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-semibold text-zinc-900">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <Link href="/messages" className="text-[13px] font-medium text-zinc-800 hover:text-black">
          Support
        </Link>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-label="Account menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex size-7 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-semibold text-white transition-transform hover:scale-105"
          >
            {userInitial}
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-md border border-zinc-200 bg-white p-1 shadow-lg">
              <div className="border-b border-zinc-100 px-3 py-2.5">
                <p className="truncate text-xs font-semibold text-zinc-900">Employer Account</p>
                <p className="truncate text-[11px] text-zinc-500">{userEmail}</p>
              </div>
              <Link
                href="/company"
                onClick={() => setMenuOpen(false)}
                className="block rounded px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
              >
                Company profile
              </Link>
              <Link
                href="/billing"
                onClick={() => setMenuOpen(false)}
                className="block rounded px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
              >
                Billing
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  void signOut();
                }}
                className="w-full text-left block rounded px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function PortalShell({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--ds-canvas)] text-[var(--ds-text)] antialiased selection:bg-[var(--co-accent)]">
      <CompanySidebar mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavOpen} />
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col lg:pl-64">
        <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="mx-auto w-full max-w-[1440px] flex-1 overflow-y-auto overscroll-contain px-4 py-6 md:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
