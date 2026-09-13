'use client';

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
import { useCurrentUser } from '@/lib/candidate-identity';
import { CandidateAvatar } from '@/components/profile/CandidateAvatar';
import { signOut } from '@/lib/auth';
import { markTourAutostart, requestTourStart } from '@/lib/tour';

const navItems = [
  { name: 'Home', href: '/dashboard' },
  { name: 'Skill Repository', href: '/assessments' },
  { name: 'Profile', href: '/profile' },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useCurrentUser();
  return (
    <header className="relative z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card/95 px-4 backdrop-blur md:px-8">
      <Link href="/dashboard" className="flex shrink-0 items-center gap-2" aria-label="SMART">
        <SmartLogo tone="on-light" className="h-6 w-auto" />
      </Link>

      <div className="flex min-w-0 flex-1 justify-center">
        <nav
          data-tour="nav-links"
          aria-label="Candidate console"
          className="scrollbar-none flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-border bg-muted/80 p-1"
        >
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'shrink-0 whitespace-nowrap rounded-full px-5 py-1.5 text-xs font-semibold transition-all duration-200',
                  active
                    ? 'border border-[#00fad0]/40 bg-[#00fad0]/15 font-bold text-[#00967c] shadow-sm'
                    : 'text-muted-foreground hover:bg-background hover:text-foreground',
                )}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-tour="profile-menu"
              className="flex items-center gap-2 rounded-full border border-transparent py-1 pl-1 pr-2 transition-colors hover:border-border hover:bg-muted data-[state=open]:border-border data-[state=open]:bg-muted"
            >
              <CandidateAvatar
                fullName={user?.fullName}
                profilePhotoUrl={user?.profilePhotoUrl}
                className="h-8 w-8 border border-[#00fad0]/30 bg-[#00fad0]/10 text-xs font-bold text-[#00967c]"
                fallbackClassName="bg-[#00fad0]/10 text-xs font-bold text-[#00967c]"
              />
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-56 rounded-2xl border border-border bg-popover p-1 text-popover-foreground shadow-lg"
          >
            <DropdownMenuLabel className="px-2.5 py-2 font-normal">
              <div className="truncate text-sm font-semibold text-foreground">
                {user?.fullName ?? 'Candidate'}
              </div>
              <div className="truncate text-xs text-muted-foreground">{user?.email ?? ''}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onSelect={() => router.push('/public-profile')}
              className="cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-sm focus:bg-muted focus:text-foreground"
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
              className="cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-sm focus:bg-muted focus:text-foreground"
            >
              <Compass className="h-4 w-4" />
              Take a tour
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onSelect={() => void signOut()}
              className="cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-sm text-rose-600 focus:bg-rose-50 focus:text-rose-700"
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
