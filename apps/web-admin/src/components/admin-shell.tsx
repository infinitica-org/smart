'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { getAccessToken } from '@smart/api-client';
import { SessionHoldWall } from '@smart/ui';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@smart/ui/sidebar';
import { ThemeSwitcher } from '@smart/ui/theme-switcher';
import { SearchDialog } from './search-dialog';
import { AppSidebar } from './app-sidebar';
import { api } from '../lib/api';
import { signOut } from '../lib/auth';
import { sidebarItems } from '../navigation/sidebar-items';

function pageCopy(pathname: string): { title: string; subtitle?: string } {
  if (pathname === '/admin') {
    return {
      title: 'Make operations self-driving.',
      subtitle: 'Tenants, verification, and integrity — in one place.',
    };
  }

  for (const group of sidebarItems) {
    for (const item of group.items) {
      if (
        item.url === '/admin'
          ? pathname === item.url
          : pathname === item.url || pathname.startsWith(`${item.url}/`)
      ) {
        return { title: item.title };
      }
    }
  }

  return { title: 'Admin' };
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const copy = pageCopy(pathname);
  const isHome = pathname === '/admin';

  return (
    <SessionHoldWall
      getAccessToken={getAccessToken}
      pollMe={() => api.auth.me()}
      onSignOut={signOut}
    >
      <SidebarProvider className="relative z-10">
        <AppSidebar />
        <SidebarInset className="admin-canvas relative z-10 min-w-0 overflow-hidden bg-transparent">
          <header
            className={
              isHome
                ? 'flex items-start justify-between gap-4 px-6 py-6 md:px-8'
                : 'flex items-center justify-between gap-4 px-6 py-4 md:px-8'
            }
          >
            <div className={isHome ? 'flex items-start gap-3' : 'flex items-center gap-3'}>
              <SidebarTrigger className={isHome ? 'mt-1 md:hidden' : 'md:hidden'} />
              <div>
                <h1
                  className={
                    isHome
                      ? 'font-heading max-w-xl text-4xl font-semibold tracking-tight md:text-5xl'
                      : 'sr-only'
                  }
                >
                  {copy.title}
                </h1>
                {isHome && copy.subtitle ? (
                  <p className="mt-2 max-w-lg text-sm text-muted-foreground">{copy.subtitle}</p>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SearchDialog />
              <ThemeSwitcher />
            </div>
          </header>
          <div className="min-h-0 flex-1 px-6 pb-12 md:px-8">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </SessionHoldWall>
  );
}
