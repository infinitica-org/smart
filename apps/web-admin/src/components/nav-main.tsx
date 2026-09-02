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
        <SidebarGroup key={group.id} className="px-2">
          <SidebarGroupLabel className="px-2 font-heading text-[11px] tracking-[0.16em] text-sidebar-foreground/40 uppercase group-data-[collapsible=icon]:pointer-events-none">
            {group.label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
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
                          ? 'h-10 rounded-xl bg-accent font-medium text-accent-foreground hover:bg-accent hover:text-accent-foreground data-active:bg-accent data-active:text-accent-foreground'
                          : 'h-10 rounded-xl text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                      }
                    >
                      <Link prefetch={false} href={item.url}>
                        <Icon strokeWidth={1.75} />
                        <span>{item.title}</span>
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
