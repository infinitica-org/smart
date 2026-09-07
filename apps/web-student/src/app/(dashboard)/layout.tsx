import type { ReactNode } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { OnboardingGate } from '@/components/layout/OnboardingGate';

/** Top-nav primary shell (CN-T05) — no wide left sidebar. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <OnboardingGate>
      <div className="flex h-screen flex-col overflow-hidden bg-black font-sans text-white">
        <Navbar />
        <main className="relative flex-1 overflow-y-auto px-4 py-7 md:px-10 md:py-9">
          <div className="relative mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </OnboardingGate>
  );
}
