'use client';

import type { ComponentProps } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@smart/ui/sidebar';
import textLogo from '@smart/ui/assets/images/Logos/WebP/Text-logo.png';
import { sidebarItems } from '@/navigation/sidebar-items';
import { NavMain } from './nav-main';
import { NavUser } from './nav-user';

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-zinc-200/80 bg-white font-sans select-none dark:border-zinc-800 dark:bg-zinc-950"
      {...props}
    >
      <SidebarHeader className="h-14 px-4 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60">
        <Link
          prefetch={false}
          href="/admin"
          aria-label="SMART Admin Console"
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 group-data-[collapsible=icon]:justify-center"
        >
          <div className="group-data-[collapsible=icon]:hidden flex items-center gap-2">
            <Image
              src={textLogo}
              alt="SMART"
              width={100}
              height={26}
              priority
              className="h-6 w-auto object-contain dark:invert"
            />
            <span className="rounded-md border border-zinc-200/80 bg-zinc-100/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              Admin
            </span>
          </div>
          <div className="hidden group-data-[collapsible=icon]:flex size-8 items-center justify-center rounded-lg bg-zinc-900 font-bold text-white text-xs">
            S
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2 py-3 overflow-y-auto overscroll-contain">
        <NavMain items={sidebarItems} />
      </SidebarContent>
      <SidebarFooter className="border-t border-zinc-100 p-2 dark:border-zinc-800/60">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
