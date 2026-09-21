'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn, UI_VERSION } from '@smart/ui';
import BlackLogo from '@smart/ui/assets/images/Logos/WebP/BLACK LOGO@4x.webp';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  GraduationCap,
  Briefcase,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  isNew?: boolean;
  subItems?: { name: string; href: string }[];
}

function isSidebarItemActive(pathname: string, item: NavItem): boolean {
  if (item.subItems?.length) {
    return item.subItems.some(
      (sub) => pathname === sub.href || pathname.startsWith(`${sub.href}/`),
    );
  }
  return pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
}

const mainNav: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  {
    name: 'Candidates',
    href: '/students',
    icon: Users,
    subItems: [
      { name: 'Candidates Repository', href: '/students' },
      { name: 'Candidate Onboarding', href: '/provisioning' },
      { name: 'Batches', href: '/batches' },
    ],
  },
  {
    name: 'Work Experience',
    href: '/work-experience-verification',
    icon: Briefcase,
    isNew: true,
  },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function TpoSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200/80 flex-col h-screen sticky top-0 left-0 z-40 shrink-0 font-sans select-none">
      {/* Brand Header: Black Logo + Version on Right */}
      <div className="h-16 px-5 flex items-center justify-between shrink-0 border-b border-slate-200/80 bg-white">
        <Link href="/" className="flex items-center">
          <Image
            src={BlackLogo}
            alt="SMART Logo"
            width={140}
            height={36}
            className="h-8 w-auto object-contain"
            priority
          />
        </Link>
        <span className="text-xs font-semibold text-slate-400">v{UI_VERSION}</span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        <ul className="space-y-1">
          {mainNav.map((item) => {
            const isActive = isSidebarItemActive(pathname, item);
            const Icon = item.icon;

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group',
                    isActive
                      ? 'bg-[#F0FDFA] text-[#004C63] font-bold border border-[#CCFBF1]/80 shadow-[0_1px_2px_rgba(0,76,99,0.05)]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/80',
                  )}
                >
                  <Icon
                    className={cn(
                      'size-4.5 shrink-0 transition-colors',
                      isActive
                        ? 'text-[#004C63] stroke-[2.2]'
                        : 'text-slate-400 group-hover:text-slate-600',
                    )}
                  />
                  <span className="truncate">{item.name}</span>
                  {item.isNew ? (
                    <span className="ml-auto bg-emerald-100 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                      New
                    </span>
                  ) : null}
                </Link>

                {/* Sub-items (Tree View) if Active */}
                {item.subItems && isActive && (
                  <div className="ml-5 pl-4 border-l border-[#004C63]/20 space-y-1.5 pt-2 pb-1">
                    {item.subItems.map((sub) => {
                      const subActive =
                        pathname === sub.href || pathname.startsWith(`${sub.href}/`);
                      return (
                        <Link
                          key={sub.name}
                          href={sub.href}
                          aria-current={subActive ? 'page' : undefined}
                          className={cn(
                            'block py-1 text-xs font-semibold transition-colors',
                            subActive ? 'text-[#004C63]' : 'text-slate-500 hover:text-[#004C63]',
                          )}
                        >
                          {sub.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sidebar Bottom Card */}
      <div className="px-4 py-3 shrink-0">
        <div className="rounded-2xl bg-gradient-to-br from-slate-50 via-[#F0FDFA]/50 to-emerald-50/30 p-4 border border-slate-200/80 shadow-xs">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white border border-[#CCFBF1] text-[#004C63] shadow-2xs mb-2.5">
            <GraduationCap className="size-5" />
          </div>
          <h4 className="text-xs font-extrabold text-slate-900 leading-tight">
            Empowering Better Futures
          </h4>
          <p className="text-[11px] font-medium text-slate-500 mt-1 leading-snug">
            Connect Talent. Create Opportunities.
          </p>
        </div>
      </div>

      {/* Bottom Footer Section */}
      <div className="px-5 py-3 border-t border-slate-100 shrink-0">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span className="hover:text-slate-600 transition-colors cursor-pointer">
            Privacy Policy | Terms
          </span>
          <span className="font-semibold text-slate-400">v{UI_VERSION}</span>
        </div>
      </div>
    </aside>
  );
}
