'use client';

import { Bell } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useProfileStore } from '@/lib/stores/profile-store';
import { cn } from '@smart/ui';
import { useState } from 'react';

const navItems = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Applications', href: '/applications' },
  { name: 'Assessments', href: '/assessments' },
  { name: 'Interviews', href: '/interviews' },
  { name: 'Profile', href: '/profile' },
];

export function Navbar() {
  const pathname = usePathname();
  const basicInfo = useProfileStore((state) => state.data.basicInfo);
  const initials =
    `${basicInfo?.firstName?.[0] ?? ''}${basicInfo?.lastName?.[0] ?? ''}`.toUpperCase() || 'SV';
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <header className="relative z-40 flex h-[72px] shrink-0 items-center gap-4 border-b border-white/[0.06] bg-[#0f0f0f] px-4 md:h-24 md:px-8">
      <Link href="/dashboard" className="relative h-10 w-24 shrink-0 md:w-28" aria-label="SMART">
        <Image
          src="/img/Logo/white-logo.png"
          alt="SMART"
          fill
          sizes="112px"
          className="object-contain object-left"
          priority
        />
      </Link>

      <div className="flex min-w-0 flex-1 justify-center">
        <nav
          aria-label="Candidate console"
          className="scrollbar-none flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-white/[0.06] bg-white/[0.03] p-1"
        >
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'shrink-0 rounded-full px-3.5 py-2 text-[14px] font-medium whitespace-nowrap transition-colors md:px-4',
                  active
                    ? 'bg-[#1f1f1f] text-white shadow-sm'
                    : 'text-white/40 hover:text-white/80',
                )}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((v) => !v)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.03] text-white/50 hover:text-white"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#00fad0]" />
          </button>
          {notificationsOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                aria-label="Close notifications"
                onClick={() => setNotificationsOpen(false)}
              />
              <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-white/10 bg-[#161616] p-4 shadow-xl">
                <p className="text-sm font-medium text-white">Notifications</p>
                <p className="mt-2 text-xs text-white/40">No new notifications.</p>
              </div>
            </>
          ) : null}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-black">
          {initials}
        </div>
      </div>
    </header>
  );
}
