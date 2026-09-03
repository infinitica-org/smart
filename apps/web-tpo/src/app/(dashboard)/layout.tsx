import type { ReactNode } from 'react';
import { TpoShell } from '../../components/tpo-shell';
import { PortalAuthGate } from '../../components/portal-auth-gate';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <PortalAuthGate>
      <TpoShell>{children}</TpoShell>
    </PortalAuthGate>
  );
}
