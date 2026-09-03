'use client';

import { useEffect, useState } from 'react';
import { EllipsisVertical, LogOut } from 'lucide-react';
import type { AuthenticatedUser } from '@smart/contracts';
import { Avatar, AvatarFallback } from '@smart/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@smart/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@smart/ui/sidebar';
import { getInitials } from '@smart/ui';
import { api } from '@/lib/api';
import { signOut } from '@/lib/auth';

export function NavUser() {
  const { isMobile } = useSidebar();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);

  useEffect(() => {
    api.auth
      .me()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  const name = user?.fullName ?? 'Admin';
  const email = user?.email ?? 'Loading…';

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="rounded-2xl hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-xl">
                <AvatarFallback className="rounded-xl bg-accent font-heading text-xs font-semibold text-accent-foreground">
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{name}</span>
                <span className="truncate text-xs text-sidebar-foreground/50">{email}</span>
              </div>
              <EllipsisVertical className="ml-auto size-4" strokeWidth={1.75} />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-2xl"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-xl">
                  <AvatarFallback className="rounded-xl bg-accent font-heading text-xs font-semibold text-accent-foreground">
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{name}</span>
                  <span className="truncate text-xs text-muted-foreground">{email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void signOut()}>
              <LogOut strokeWidth={1.75} />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
