'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { cn, UI_VERSION } from '@smart/ui';
import textLogo from '@smart/ui/assets/images/Logos/WebP/Text-logo.png';
import { isNavLinkActive, isPlacementTopNavActive } from '../lib/tpo-nav';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Briefcase,
  BarChart3,
  GraduationCap,
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
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200/80 bg-white font-sans shadow-xl transition-transform duration-200 select-none lg:z-30 lg:translate-x-0 lg:shadow-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 px-5">
          <Link href="/" className="flex items-center" aria-label="SMART home">
            <Image
              src={textLogo}
              alt="SMART"
              width={120}
              height={28}
              priority
              className="h-7 w-auto object-contain"
            />
          </Link>
          <span className="text-xs font-semibold text-slate-400">v{UI_VERSION}</span>
        </div>

        <button
          type="button"
          aria-label="Close menu"
          className="absolute right-3 top-3.5 rounded-lg p-1 text-slate-500 hover:bg-slate-100 lg:hidden"
          onClick={() => onMobileOpenChange(false)}
        >
          <X className="size-5" />
        </button>

        <nav
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-4"
          aria-label="University console"
        >
          <ul className="space-y-1">
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
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all group',
                      isActive
                        ? 'border border-[#CCFBF1]/80 bg-[#F0FDFA] font-bold text-[#004C63] shadow-[0_1px_2px_rgba(0,76,99,0.05)]'
                        : 'text-slate-600 hover:bg-slate-50/80 hover:text-slate-900',
                    )}
                  >
                    <Icon
                      className={cn(
                        'size-4.5 shrink-0 transition-colors',
                        isActive
                          ? 'stroke-[2.2] text-[#004C63]'
                          : 'text-slate-400 group-hover:text-slate-600',
                      )}
                    />
                    <span className="truncate">{item.name}</span>
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
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all group',
                  pathname.startsWith('/settings')
                    ? 'border border-[#CCFBF1]/80 bg-[#F0FDFA] font-bold text-[#004C63]'
                    : 'text-slate-600 hover:bg-slate-50/80 hover:text-slate-900',
                )}
              >
                <Settings
                  className={cn(
                    'size-4.5 shrink-0',
                    pathname.startsWith('/settings') ? 'text-[#004C63]' : 'text-slate-400',
                  )}
                />
                <span className="truncate">Settings</span>
              </Link>
            </li>
          </ul>
        </nav>

        <div className="shrink-0 px-4 py-3">
          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-[#F0FDFA]/50 to-emerald-50/30 p-4">
            <div className="mb-2.5 flex size-9 items-center justify-center rounded-xl border border-[#CCFBF1] bg-white text-[#004C63]">
              <GraduationCap className="size-5" />
            </div>
            <h4 className="text-xs font-extrabold leading-tight text-slate-900">
              Empowering Better Futures
            </h4>
            <p className="mt-1 text-[11px] font-medium leading-snug text-slate-500">
              Connect Talent. Create Opportunities.
            </p>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-100 px-5 py-3">
          <p className="text-[11px] font-medium text-slate-400">Privacy Policy · Terms</p>
        </div>
      </aside>
    </>
  );
}
