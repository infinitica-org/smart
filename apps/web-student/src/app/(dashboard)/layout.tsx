import type { ReactNode } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { OnboardingGate } from '@/components/layout/OnboardingGate';

/** Top-nav primary shell (CN-T05) — no wide left sidebar. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <OnboardingGate>
      <div className="flex h-screen flex-col overflow-hidden bg-[var(--ds-canvas)] font-sans text-[var(--ds-text)]">
        <Navbar />
        <main className="relative flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <div className="relative mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
    </OnboardingGate>
  );
}
