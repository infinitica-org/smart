'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@smart/ui/sidebar';
import type { NavGroup, NavItem } from '@/navigation/sidebar-items';

function isActive(pathname: string, item: NavItem): boolean {
  if (item.url === '/admin') return pathname === '/admin';
  return pathname === item.url || pathname.startsWith(`${item.url}/`);
}

export function NavMain({ items }: { items: readonly NavGroup[] }) {
  const pathname = usePathname();

  return (
    <>
      {items.map((group) => (
        <SidebarGroup key={group.id} className="px-1 py-1.5">
          <SidebarGroupLabel className="px-2.5 text-[10px] font-bold tracking-[0.14em] text-zinc-400 dark:text-zinc-500 uppercase group-data-[collapsible=icon]:pointer-events-none">
            {group.label}
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-0.5">
            <SidebarMenu className="gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item);
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={active}
                      className={
                        active
                          ? 'h-9 rounded-lg bg-zinc-900 text-xs font-semibold text-white shadow-xs hover:bg-zinc-900 hover:text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-100 transition-all'
                          : 'h-9 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors'
                      }
                    >
                      <Link
                        prefetch={false}
                        href={item.url}
                        className="flex items-center gap-2.5 px-2.5"
                      >
                        <Icon strokeWidth={active ? 2 : 1.75} className="size-4 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
