'use client';

import type { ReactNode } from 'react';
import { SidebarInset, SidebarProvider } from '@smart/ui/sidebar';
import { CompanySidebar } from './company-sidebar';
import { CompanyTopbar } from './company-topbar';

export function CompanyShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider className="min-h-dvh bg-[#f8fafc]">
      <CompanySidebar />
      <SidebarInset className="min-w-0 bg-[#f8fafc] flex flex-col flex-1">
        <CompanyTopbar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
