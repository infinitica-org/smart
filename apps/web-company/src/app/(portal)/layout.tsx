'use client';

import type { ReactNode } from 'react';
import { CompanyPortalProviders } from '@/components/company-portal-providers';
import { CompanyShell } from '@/components/company-shell';

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <CompanyPortalProviders>
      <CompanyShell>{children}</CompanyShell>
    </CompanyPortalProviders>
  );
}
