'use client';

import type { ComponentProps } from 'react';
import Link from 'next/link';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@smart/ui/sidebar';
import { SmartLogo } from '@smart/ui';
import { sidebarItems } from '@/navigation/sidebar-items';
import { NavMain } from './nav-main';
import { NavUser } from './nav-user';

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" className="border-r-0 weight-bold" {...props}>
      <SidebarHeader className="px-3 pt-5">
        <Link
          prefetch={false}
          href="/admin"
          aria-label="SMART admin"
          className="flex h-12 items-center rounded-2xl px-2 text-sidebar-foreground outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <SmartLogo
            kind="wordmark"
            className="h-8 w-[7.5rem] group-data-[collapsible=icon]:hidden"
          />
          <SmartLogo kind="mark" className="hidden size-8 group-data-[collapsible=icon]:flex" />
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-3">
        <NavMain items={sidebarItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
