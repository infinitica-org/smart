import type { ReactNode } from 'react';
import { TpoShell } from '../../components/tpo-shell';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <TpoShell>
      <div className="tpo-bento-theme min-h-full w-full bg-[var(--ds-canvas)] text-[var(--ds-text)]">
        {children}
      </div>
    </TpoShell>
  );
}
