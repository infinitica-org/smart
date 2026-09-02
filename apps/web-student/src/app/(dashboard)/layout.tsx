import type { ReactNode } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { OnboardingGate } from '@/components/layout/OnboardingGate';

/** Top-nav primary shell (CN-T05) — no wide left sidebar. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <OnboardingGate>
      <div className="flex h-screen flex-col overflow-hidden bg-[#0a0a0a] font-sans text-gray-200">
        <Navbar />
        <main className="relative flex-1 overflow-y-auto px-4 py-7 md:px-10 md:py-9">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,250,208,0.045),_transparent_55%)]" />
          <div className="relative">{children}</div>
        </main>
      </div>
    </OnboardingGate>
  );
}
