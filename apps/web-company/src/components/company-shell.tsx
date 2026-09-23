'use client';

import type { ReactNode } from 'react';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@smart/ui/sidebar';
import { CompanySidebar } from './company-sidebar';

export function CompanyShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider className="min-h-dvh bg-[#f8fafc]">
      <CompanySidebar />
      <SidebarInset className="min-w-0 bg-[#f8fafc]">
        <header className="flex h-14 items-center gap-3 border-b border-border/60 bg-white/80 px-4 backdrop-blur md:px-6">
          <SidebarTrigger className="md:hidden" />
          <p className="text-sm text-muted-foreground md:hidden">SMART Company</p>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
