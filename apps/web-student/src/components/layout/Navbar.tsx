'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn, SmartLogo, SignOutButton } from '@smart/ui';
import { initialsOf, useCurrentUser } from '@/lib/candidate-identity';
import { signOut } from '@/lib/auth';

const navItems = [
  { name: 'Home', href: '/dashboard' },
  { name: 'Skills', href: '/assessments' },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  const initials = initialsOf(user?.fullName);

  return (
    <header className="relative z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-zinc-800/80 bg-[#0e0e10]/90 px-4 md:px-8 backdrop-blur">
      <Link href="/dashboard" className="flex items-center gap-2 shrink-0" aria-label="SMART">
        <SmartLogo tone="on-dark" className="h-6 w-auto" />
      </Link>

      <div className="flex min-w-0 flex-1 justify-center">
        <nav
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
        <SignOutButton onSignOut={signOut} />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800/90 text-xs font-bold text-[#00fad0] border border-[#00fad0]/30 shadow-inner">
          {initials}
        </div>
      </div>
    </header>
  );
}
