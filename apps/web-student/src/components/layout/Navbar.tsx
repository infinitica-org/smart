'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import Link from 'next/link';

import { ChevronDown, Compass, LogOut, UserRound } from 'lucide-react';

import { cn, SmartLogo } from '@smart/ui';

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

import { ColorSchemeToggle } from '@/components/layout/color-scheme-toggle';

const navItems = [
  { name: 'Home', href: '/dashboard' },

  { name: 'Skill Repository', href: '/assessments' },

  { name: 'Profile', href: '/profile' },
];

export function Navbar() {
  const pathname = usePathname();

  const router = useRouter();

  const { data: user } = useCurrentUser();

  const { resolvedTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  const logoTone = themeMounted && resolvedTheme === 'dark' ? 'on-dark' : 'on-light';

  const displayName = firstNameOf(user?.fullName) || 'Candidate';

  return (
    <header className="relative z-40 flex h-[4.25rem] shrink-0 items-center justify-between gap-4 border-b border-[var(--ds-border)] bg-[var(--ds-surface)] px-4 md:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-5">
        <Link href="/dashboard" className="shrink-0" aria-label="SMART home">
          <SmartLogo kind="mark" tone={logoTone} className="h-8 w-8" />
        </Link>

        <nav
          data-tour="nav-links"

          aria-label="Candidate console"

          className="scrollbar-none flex min-w-0 max-w-full items-center gap-0.5 overflow-x-auto md:gap-1"
        >
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}

                href={item.href}

                aria-current={active ? 'page' : undefined}

                className={cn(
                  'shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 md:px-4',

                  active
                    ? 'font-semibold text-[var(--ds-green)]'
                    : 'text-[var(--ds-icon)] hover:text-[var(--ds-text)]',
                )}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 md:gap-3">
        <ColorSchemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"

              data-tour="profile-menu"

              className="flex max-w-[140px] items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-[var(--ds-surface-hover)] data-[state=open]:bg-[var(--ds-surface-hover)] md:max-w-none"
            >
              <CandidateAvatar
                fullName={user?.fullName}

                profilePhotoUrl={user?.profilePhotoUrl}

                className="h-9 w-9 border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] text-xs font-semibold text-[var(--ds-text)]"

                fallbackClassName="bg-[var(--ds-surface-muted)] text-xs font-semibold text-[var(--ds-text)]"
              />

              <span className="hidden truncate text-sm font-medium text-[var(--ds-text)] md:inline">
                {displayName}
              </span>

              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--ds-text-subtle)]" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" sideOffset={8} className="w-56">
            <DropdownMenuLabel className="px-2.5 py-2 font-normal">
              <div className="truncate text-sm font-semibold">{user?.fullName ?? 'Candidate'}</div>

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

              className="cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-sm text-rose-600 focus:bg-rose-50 focus:text-rose-700 dark:focus:bg-rose-950/40 dark:focus:text-rose-400"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
