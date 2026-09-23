'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SmartLogo } from '@smart/ui';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@smart/ui/sidebar';
import { companyNavItems } from '@/navigation/sidebar-items';
import { CompanyNavUser } from './company-nav-user';

export function CompanySidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/60 px-4 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <SmartLogo kind="mark" tone="on-light" className="size-8 shrink-0" title="SMART" />
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
              SMART Company
            </span>
            <span className="text-xs text-sidebar-foreground/60">Employer portal</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {companyNavItems.map((item) => {
                const active =
                  item.url === '/'
                    ? pathname === '/'
                    : pathname === item.url || pathname.startsWith(`${item.url}/`);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild={!item.disabled}
                      isActive={active}
                      disabled={item.disabled}
                    >
                      {item.disabled ? (
                        <span className="flex w-full items-center gap-2 opacity-60">
                          <item.icon className="size-4" strokeWidth={1.75} />
                          <span>{item.title}</span>
                        </span>
                      ) : (
                        <Link href={item.url}>
                          <item.icon className="size-4" strokeWidth={1.75} />
                          <span>{item.title}</span>
                        </Link>
                      )}
                    </SidebarMenuButton>
                    {item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/60">
        <CompanyNavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
