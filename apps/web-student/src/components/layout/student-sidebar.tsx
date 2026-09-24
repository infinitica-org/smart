'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Award,
  FileCheck,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Gauge,
  Settings,
  Sparkles,
  Target,
  User,
  Video,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@smart/ui';
import textLogo from '@smart/ui/assets/images/Logos/WebP/Text-logo.png';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

const mainNavItems: NavItem[] = [
  { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Matches', href: '/matches', icon: Target },
  { name: 'Opportunities', href: '/opportunities', icon: Sparkles },
  { name: 'Messages', href: '/messages', icon: MessageSquare },
  { name: 'My profile', href: '/profile', icon: User },
  { name: 'Skills', href: '/skills', icon: Award },
  { name: 'Readiness', href: '/readiness', icon: Gauge },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const verificationNavItems: NavItem[] = [
  { name: 'Endorsement tracking', href: '/applications', icon: FileCheck },
  { name: 'Assessments', href: '/assessments', icon: FileText },
  { name: 'Interviews', href: '/interviews', icon: Video },
];

export type StudentSidebarProps = {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
};

export function StudentSidebar({ mobileOpen, onMobileOpenChange }: StudentSidebarProps) {
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
        aria-label="Student console sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200/80 bg-white font-sans shadow-xl transition-transform duration-200 select-none lg:z-30 lg:translate-x-0 lg:shadow-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            aria-label="SMART home"
          >
            <Image
              src={textLogo}
              alt="SMART"
              width={110}
              height={30}
              priority
              className="h-7 w-auto object-contain"
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
          className="flex-1 overflow-y-auto overscroll-contain bg-white px-3 py-4 space-y-6"
          aria-label="Student console"
        >
          <ul className="space-y-1.5">
            {mainNavItems.map((item) => {
              const basePath = item.href.split('?')[0] || item.href;
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(basePath));
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

          <div>
            <div className="px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">
              Verification
            </div>
            <ul className="space-y-1.5">
              {verificationNavItems.map((item) => {
                const basePath = item.href.split('?')[0] || item.href;
                const isActive = pathname.startsWith(basePath);
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

        <div className="shrink-0 border-t border-slate-100 px-4 py-3 space-y-2">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900">Verification</span>
              <span className="text-xs font-bold text-emerald-600">33%</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">Profile strength verified</p>
            <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 w-[33%]" />
            </div>
          </div>
          <div className="text-[11px] font-medium text-slate-400 px-1">Privacy Policy · Terms</div>
        </div>
      </aside>
    </>
  );
}
