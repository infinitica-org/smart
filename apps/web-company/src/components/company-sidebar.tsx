'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@smart/ui';
import textLogo from '@smart/ui/assets/images/Logos/WebP/Text-logo.png';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@smart/ui/sidebar';
import { companyNavItems } from '@/navigation/sidebar-items';
export interface CompanySidebarProps {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  className?: string;
}

export function CompanySidebar({ className }: CompanySidebarProps = {}) {
  const pathname = usePathname();

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className={cn('border-r border-slate-200/80 bg-white font-sans', className)}
    >
      {/* Top Header with Text Logo */}
      <SidebarHeader className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 px-4">
        <Link
          href="/"
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
          <span className="rounded-md border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-700 group-data-[collapsible=icon]:hidden">
            Company
          </span>
        </Link>
      </SidebarHeader>

      {/* Navigation List — Matching TPO console style */}
      <SidebarContent className="flex-1 overflow-y-auto overscroll-contain bg-white px-3 py-4">
        <nav aria-label="Company portal navigation">
          <ul className="space-y-1.5">
            {companyNavItems.map((item) => {
              const active =
                item.url === '/'
                  ? pathname === '/'
                  : pathname === item.url || pathname.startsWith(`${item.url}/`);
              const Icon = item.icon;

              return (
                <li key={item.url}>
                  <Link
                    href={item.url}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900',
                      active
                        ? 'bg-zinc-100 font-bold text-zinc-900'
                        : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
                    )}
                  >
                    <Icon
                      className={cn(
                        'size-5 shrink-0 transition-colors',
                        active
                          ? 'stroke-[2.2] text-zinc-900'
                          : 'text-zinc-400 group-hover:text-zinc-600',
                      )}
                    />
                    <span className="truncate group-data-[collapsible=icon]:hidden">
                      {item.title}
                    </span>
                    {item.badge ? (
                      <span className="ml-auto rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 group-data-[collapsible=icon]:hidden">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </SidebarContent>

      {/* Sidebar Footer with User Details */}
      <SidebarFooter className="border-t border-slate-100 p-2"></SidebarFooter>
    </Sidebar>
  );
}
