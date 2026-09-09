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
import { initialsOf, useCurrentUser } from '@/lib/candidate-identity';
import { signOut } from '@/lib/auth';
import { markTourAutostart, requestTourStart } from '@/lib/tour';

const navItems = [
  { name: 'Home', href: '/dashboard' },
  { name: 'Skills', href: '/assessments' },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const initials = initialsOf(user?.fullName);

  return (
    <header className="relative z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-zinc-800/80 bg-[#0e0e10]/90 px-4 md:px-8 backdrop-blur">
      <Link href="/dashboard" className="flex items-center gap-2 shrink-0" aria-label="SMART">
        <SmartLogo tone="on-dark" className="h-6 w-auto" />
      </Link>

      <div className="flex min-w-0 flex-1 justify-center">
        <nav
          data-tour="nav-links"
          aria-label="Candidate console"
          className="scrollbar-none flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-zinc-800/80 bg-zinc-900/60 p-1"
        >
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'shrink-0 rounded-full px-5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200',
                  active
                    ? 'bg-[#00fad0]/20 text-[#00fad0] border border-[#00fad0]/40 font-bold shadow-[0_0_12px_rgba(0,250,208,0.15)]'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50',
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
              className="flex items-center gap-2 rounded-full border border-transparent py-1 pr-2 pl-1 transition-colors hover:border-zinc-800 hover:bg-zinc-900/60 data-[state=open]:border-zinc-800 data-[state=open]:bg-zinc-900/60"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#00fad0]/30 bg-zinc-800/90 text-xs font-bold text-[#00fad0] shadow-inner">
                {initials}
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-56 rounded-2xl border border-zinc-800 bg-zinc-900 p-1 text-zinc-200 shadow-xl shadow-black/40"
          >
            <DropdownMenuLabel className="px-2.5 py-2 font-normal">
              <div className="truncate text-sm font-semibold text-white">
                {user?.fullName ?? 'Candidate'}
              </div>
              <div className="truncate text-xs text-zinc-500">{user?.email ?? ''}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem
              onSelect={() => router.push('/public-profile')}
              className="cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-sm text-zinc-200 focus:bg-zinc-800 focus:text-white"
            >
              <UserRound className="h-4 w-4" />
              Public profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                // The tour's targets only exist on the dashboard: if we're already
                // there, start it directly; otherwise flag it to auto-start once the
                // dashboard has actually mounted.
                if (pathname === '/dashboard') {
                  requestTourStart();
                } else {
                  markTourAutostart();
                  router.push('/dashboard');
                }
              }}
              className="cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-sm text-zinc-200 focus:bg-zinc-800 focus:text-white"
            >
              <Compass className="h-4 w-4" />
              Take a tour
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem
              onSelect={() => void signOut()}
              className="cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-sm text-rose-400 focus:bg-rose-500/10 focus:text-rose-300"
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
