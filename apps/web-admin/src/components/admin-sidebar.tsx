'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { X, type LucideIcon } from 'lucide-react';
import { cn } from '@smart/ui';
import textLogo from '@smart/ui/assets/images/Logos/WebP/Text-logo.png';
import { sidebarItems } from '@/navigation/sidebar-items';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  dot?: boolean;
}

const primaryNav: NavItem[] = [
  { name: 'Overview', href: '/admin', icon: LayoutDashboard },
  { name: 'Universities', href: '/admin/institutions', icon: GraduationCap },
  { name: 'Employers', href: '/admin/companies', icon: Building2 },
  { name: 'Verification queue', href: '/admin/verification', icon: CheckCircle2, dot: true },
  { name: 'Trust & safety', href: '/admin/integrity', icon: ShieldAlert, dot: true },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Admin users', href: '/admin/platform-admins', icon: UserCog },
];

const secondaryNav: NavItem[] = [
  { name: 'Audit log', href: '/admin/audit', icon: ScrollText },
  { name: 'Support tool', href: '/admin/support', icon: HelpCircle },
  { name: 'Health & monitoring', href: '/admin/health', icon: HeartPulse },
];

import {
  BarChart3,
  Building2,
  CheckCircle2,
  GraduationCap,
  HeartPulse,
  HelpCircle,
  LayoutDashboard,
  ScrollText,
  ShieldAlert,
  UserCog,
} from 'lucide-react';

function isItemActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin' || pathname === '/admin/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

type AdminSidebarProps = {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
};

export function AdminSidebar({ mobileOpen, onMobileOpenChange }: AdminSidebarProps) {
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
        aria-label="Admin console sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200/80 bg-white font-sans shadow-xl transition-transform duration-200 select-none lg:z-30 lg:translate-x-0 lg:shadow-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Brand Header */}
        <div className="flex h-14 shrink-0 items-center justify-between px-4">
          <Link
            href="/admin"
            className="flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            aria-label="SMART Admin home"
          >
            <Image
              src={textLogo}
              alt="SMART"
              width={100}
              height={26}
              priority
              className="h-6 w-auto object-contain"
            />
          </Link>

          <button
            type="button"
            aria-label="Close menu"
            className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 lg:hidden"
            onClick={() => onMobileOpenChange(false)}
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav
          className="flex-1 overflow-y-auto overscroll-contain bg-white px-3 py-3"
          aria-label="Admin console navigation"
        >
          <ul className="space-y-1.5">
            {primaryNav.map((item) => {
              const isActive = isItemActive(pathname, item.href);
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
                    {item.dot ? (
                      <span
                        className="ml-auto size-1.5 rounded-full bg-blue-600 shrink-0"
                        aria-hidden
                      />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Secondary Group */}
          <div className="mt-6 pt-4 border-t border-zinc-100 space-y-1">
            <ul className="space-y-1 mt-1">
              {secondaryNav.map((item) => {
                const isActive = isItemActive(pathname, item.href);
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
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100 px-5 py-3">
          <p className="text-[11px] font-medium text-slate-400">SMART Admin Platform · 2026</p>
        </div>
      </aside>
    </>
  );
}
