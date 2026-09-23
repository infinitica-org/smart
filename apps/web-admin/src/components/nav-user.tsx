'use client';

import { useEffect, useState } from 'react';
import { EllipsisVertical, LogOut } from 'lucide-react';
import type { AuthenticatedUser } from '@smart/contracts';

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
  const email = user?.email ?? 'admin@smart.local';

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="rounded-xl p-2 hover:bg-zinc-100 data-[state=open]:bg-zinc-100 dark:hover:bg-zinc-800 dark:data-[state=open]:bg-zinc-800 transition-colors"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 font-mono text-xs font-bold text-white shadow-2xs dark:bg-zinc-100 dark:text-zinc-950">
                {getInitials(name)}
              </div>
              <div className="grid flex-1 text-left text-xs leading-tight">
                <span className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                  {name}
                </span>
                <span className="truncate text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                  {email}
                </span>
              </div>
              <EllipsisVertical className="ml-auto size-4 text-zinc-400" strokeWidth={1.75} />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl border border-zinc-200/90 bg-white/95 p-1.5 shadow-xl backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-800/60">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 font-mono text-xs font-bold text-white shadow-2xs dark:bg-zinc-100 dark:text-zinc-950">
                    {getInitials(name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {name}
                    </p>
                    <p className="truncate text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                      {email}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-zinc-200/60 pt-1.5 dark:border-zinc-700/60">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Platform Admin
                  </span>
                  <span className="font-mono text-[9px] text-zinc-400">SMART 2026</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1 bg-zinc-100 dark:bg-zinc-800" />
            <DropdownMenuItem
              onSelect={() => void signOut()}
              className="group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              <LogOut strokeWidth={1.75} className="size-3.5" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
