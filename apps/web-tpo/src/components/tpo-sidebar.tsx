'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn, UI_VERSION } from '@smart/ui';
import BlackLogo from '@smart/ui/assets/images/Logos/WebP/BLACK LOGO@4x.webp';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Target,
  Layers,
  Settings,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  subItems?: { name: string; href: string }[];
}

const mainNav: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Candidates', href: '/students', icon: Users },
  { name: 'Placements', href: '/placements', icon: Briefcase },
  { name: 'Opportunities', href: '/opportunities', icon: Target },
  { name: 'Batches', href: '/batches', icon: Layers },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function TpoSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200/80 flex-col h-screen sticky top-0 left-0 z-40 shrink-0 font-sans select-none">
      {/* Brand Header: Black Logo + Version on Right */}
      <div className="h-16 px-6 flex items-center justify-between shrink-0 border-b border-r border-slate-200/80 bg-white">
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
        <span className="text-sm font-semibold text-slate-400">v{UI_VERSION}</span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-6 py-2 space-y-6  border-1 border-r border-slate-200">
        <ul className="space-y-6">
          {mainNav.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <li key={item.name} className="space-y-2">
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 text-base font-medium transition-colors group',
                    isActive
                      ? 'font-extrabold text-slate-900'
                      : 'text-slate-500 hover:text-slate-900',
                  )}
                >
                  <Icon
                    className={cn(
                      'size-5 transition-colors',
                      isActive
                        ? 'text-slate-900 stroke-[2.5]'
                        : 'text-slate-400 group-hover:text-slate-600',
                    )}
                  />
                  <span>{item.name}</span>
                </Link>

                {/* Sub-items (Tree View) if Active */}
                {item.subItems && isActive && (
                  <div className="ml-2.5 pl-5 border-l border-slate-200 space-y-3 pt-1">
                    {item.subItems.map((sub) => (
                      <Link
                        key={sub.name}
                        href={sub.href}
                        className="block text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Footer Section */}
      <div className="px-6 py-4 space-y-5 border-t border-slate-100 shrink-0">
        {/* Institution Plan / Copyright / Version */}
        <div className="pt-1 border-t border-slate-100">
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>Privacy Policy | Terms</span>
            <span className="font-semibold text-slate-400">v{UI_VERSION}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
