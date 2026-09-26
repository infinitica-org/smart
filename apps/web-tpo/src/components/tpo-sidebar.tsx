'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { cn } from '@smart/ui';

import smartLogoImg from '@smart/ui/assets/images/Logos/WebP/Smart-logo.png';
import { isNavLinkActive, isPlacementTopNavActive } from '../lib/tpo-nav';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Briefcase,
  BarChart3,
  Handshake,
  CalendarDays,
  Settings,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

const mainNav: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Students', href: '/students', icon: Users },
  { name: 'Whitelist', href: '/whitelist', icon: UserPlus },
  { name: 'Employers', href: '/companies', icon: Briefcase },
  { name: 'Campus access', href: '/campus', icon: Handshake },
  { name: 'Events', href: '/events', icon: CalendarDays },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
];

function isSidebarItemActive(pathname: string, item: NavItem): boolean {
  if (item.href === '/') return pathname === '/' || pathname === '/dashboard';
  if (item.name === 'Employers') return isPlacementTopNavActive(pathname);
  if (item.name === 'Students') {
    return (
      isNavLinkActive(pathname, '/students') ||
      isNavLinkActive(pathname, '/batches') ||
      pathname.startsWith('/work-experience-verification') ||
      pathname.startsWith('/skill-verification')
    );
  }
  if (item.name === 'Whitelist') {
    return (
      isNavLinkActive(pathname, '/whitelist') ||
      isNavLinkActive(pathname, '/onboarding') ||
      isNavLinkActive(pathname, '/provisioning')
    );
  }
  return isNavLinkActive(pathname, item.href);
}

type TpoSidebarProps = {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
};

export function TpoSidebar({ mobileOpen, onMobileOpenChange }: TpoSidebarProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!mobileOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onMobileOpenChange(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, onMobileOpenChange]);

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => onMobileOpenChange(false)}
        />
      ) : null}

      <aside
        role={mobileOpen ? 'dialog' : undefined}
        aria-modal={mobileOpen ? 'true' : undefined}
        aria-label="University console sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200/80 bg-white font-sans shadow-xl transition-transform duration-200 select-none lg:z-30 lg:translate-x-0 lg:shadow-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            aria-label="SMART home"
          >
            <Image
              src={smartLogoImg}
              alt="SMART logo"
              width={32}
              height={32}
              priority
              className="h-8 w-8 shrink-0 object-contain"
            />
          </Link>
        </div>

        <button
          type="button"
          aria-label="Close menu"
          className="absolute right-3 top-3.5 rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 lg:hidden"
          onClick={() => onMobileOpenChange(false)}
        >
          <X className="size-5" />
        </button>

        <nav
          className="flex-1 overflow-y-auto overscroll-contain bg-white px-3 py-4"
          aria-label="University console"
        >
          <ul className="space-y-1.5">
            {mainNav.map((item) => {
              const isActive = isSidebarItemActive(pathname, item);
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => onMobileOpenChange(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900',
                      isActive
                        ? 'bg-zinc-100 font-bold text-zinc-900'
                        : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
                    )}
                  >
                    <Icon
                      className={cn(
                        'size-5 shrink-0 transition-colors',
                        isActive
                          ? 'stroke-[2.2] text-zinc-900'
                          : 'text-zinc-400 group-hover:text-zinc-600',
                      )}
                    />
                    <span className="truncate">{item.name}</span>
                    {item.name === 'Whitelist' ? (
                      <span
                        className="ml-auto size-1.5 rounded-full bg-blue-600 shrink-0"
                        aria-hidden
                      />
                    ) : null}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                href="/settings"
                onClick={() => onMobileOpenChange(false)}
                aria-current={pathname.startsWith('/settings') ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-all group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900',
                  pathname.startsWith('/settings')
                    ? 'bg-zinc-100 font-bold text-zinc-900'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
                )}
              >
                <Settings
                  className={cn(
                    'size-5 shrink-0',
                    pathname.startsWith('/settings') ? 'text-zinc-900' : 'text-zinc-400',
                  )}
                />
                <span className="truncate">Settings</span>
              </Link>
            </li>
          </ul>
        </nav>

        <div className="shrink-0 border-t border-slate-100 px-5 py-3">
          <p className="text-[11px] font-medium text-slate-400">Privacy Policy · Terms</p>
        </div>
      </aside>
    </>
  );
}
