'use client';

import { useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import Link from 'next/link';

import { ChevronDown, Compass, LogOut, Menu, UserRound, X } from 'lucide-react';

import { SmartLogo } from '@smart/ui';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@smart/ui/dropdown-menu';

import { firstNameOf, useCurrentUser } from '@/lib/candidate-identity';

import { CandidateAvatar } from '@/components/profile/CandidateAvatar';

import { signOut } from '@/lib/auth';

import { markTourAutostart, requestTourStart } from '@/lib/tour';

import {
  topbarFontClass,
  topbarMobileNavRowClass,
  topbarNavLinkActiveClass,
  topbarNavLinkBaseClass,
  topbarNavUnderlineClass,
  topbarPrimaryNavClass,
  topbarProBadgeClass,
  topbarSeparatorClass,
  topbarShellClass,
} from '@/lib/student-topbar-ui';

const navItems = [
  { name: 'Home', href: '/dashboard' },
  { name: 'Profile', href: '/profile' },
  { name: 'Assessment', href: '/assessment' },
  { name: 'Interview', href: '/interview' },
  { name: 'Jobs', href: '/jobs' },
];

function TopbarNavLink({
  href,
  isActive,
  children,
}: {
  href: string;
  isActive: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={`${topbarNavLinkBaseClass} ${isActive ? topbarNavLinkActiveClass : ''}`}
    >
      <span>{children}</span>
      <span
        aria-hidden
        className={`${topbarNavUnderlineClass} ${isActive ? 'opacity-100' : 'opacity-0'}`}
        data-testid={isActive ? 'topbar-nav-active-indicator' : undefined}
      />
    </Link>
  );
}

function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const displayName = firstNameOf(user?.fullName) || 'Candidate';

  return (
    <header className={`${topbarShellClass} ${topbarFontClass} relative px-4 lg:px-6`}>
      <div className="flex w-full min-w-0 items-stretch">
        <div className="flex shrink-0 items-center gap-3 self-center">
          <Link href="/dashboard" aria-label="SMART home" className="group flex items-center gap-2">
            <SmartLogo
              kind="mark"
              tone="on-light"
              className="size-7 transition-opacity group-hover:opacity-80"
              title="SMART"
            />
            <span className={topbarProBadgeClass}>PRO</span>
          </Link>
        </div>

        <div className={topbarSeparatorClass} aria-hidden />

        <nav data-tour="nav-links" aria-label="Candidate console" className={topbarPrimaryNavClass}>
          {navItems.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <TopbarNavLink key={item.href} href={item.href} isActive={active}>
                {item.name}
              </TopbarNavLink>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1 self-center md:gap-0">
          <DropdownMenu onOpenChange={() => setMobileMenuOpen(false)}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                data-tour="profile-menu"
                className="flex max-w-[140px] items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-[var(--ds-surface-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-text)] data-[state=open]:bg-[var(--ds-surface-hover)] md:max-w-[220px]"
              >
                <CandidateAvatar
                  fullName={user?.fullName}
                  profilePhotoUrl={user?.profilePhotoUrl}
                  className="size-7 border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] text-xs font-semibold text-[var(--ds-text-secondary)]"
                  fallbackClassName="bg-transparent text-xs font-semibold text-[var(--ds-text-secondary)]"
                />
                <div className="hidden min-w-0 flex-col items-start text-left lg:flex">
                  <span className="truncate text-[12px] font-semibold leading-tight text-[var(--ds-text)]">
                    {displayName}
                  </span>
                  <span className="truncate text-[10px] font-medium leading-tight text-[var(--ds-text-muted)]">
                    Candidate
                  </span>
                </div>
                <ChevronDown
                  strokeWidth={1.5}
                  className="hidden size-4 shrink-0 text-[var(--ds-text-subtle)] lg:block"
                  aria-hidden
                />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" sideOffset={8} className="w-56">
              <DropdownMenuLabel className="px-2.5 py-2 font-normal">
                <div className="truncate text-sm font-semibold">
                  {user?.fullName ?? 'Candidate'}
                </div>
                <div className="truncate text-xs text-muted-foreground">{user?.email ?? ''}</div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onSelect={() => router.push('/public-profile')}
                className="cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-sm"
              >
                <UserRound className="h-4 w-4" />
                Public profile
              </DropdownMenuItem>

              <DropdownMenuItem
                onSelect={() => {
                  if (pathname === '/dashboard') {
                    requestTourStart();
                  } else {
                    markTourAutostart();
                    router.push('/dashboard');
                  }
                }}
                className="cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-sm"
              >
                <Compass className="h-4 w-4" />
                Take a tour
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onSelect={() => void signOut()}
                className="cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-sm text-[var(--ds-coral)] focus:bg-[#fef4f4] focus:text-[var(--ds-coral)] dark:focus:bg-rose-950/40"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={mobileMenuOpen}
            className="rounded-lg p-2 text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-text)] xl:hidden"
          >
            {mobileMenuOpen ? (
              <X strokeWidth={1.5} className="size-[18px]" />
            ) : (
              <Menu strokeWidth={1.5} className="size-[18px]" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="absolute left-0 top-full z-50 flex w-full flex-col gap-1 border-b border-[var(--ds-border)] bg-[var(--ds-surface)] p-3 shadow-[var(--ds-card-shadow)] xl:hidden">
          {navItems.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                onClick={() => setMobileMenuOpen(false)}
                className={topbarMobileNavRowClass(active)}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
