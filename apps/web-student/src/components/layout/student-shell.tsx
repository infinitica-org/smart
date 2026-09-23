'use client';

import { useState, type ReactNode } from 'react';
import { StudentSidebar } from './student-sidebar';
import { StudentTopbar } from './student-topbar';
import { OnboardingGate } from './OnboardingGate';

export function StudentShell({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <OnboardingGate>
      <div className="student-console flex h-screen overflow-hidden bg-zinc-50 text-zinc-900 antialiased dark:bg-[#0c0c0c] dark:text-zinc-100 font-sans select-none">
        <StudentSidebar mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavOpen} />
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col lg:pl-64">
          <StudentTopbar onOpenMobileNav={() => setMobileNavOpen(true)} />
          <main className="mx-auto w-full max-w-[1440px] flex-1 overflow-y-auto overscroll-contain px-4 py-6 md:px-8 md:py-8">
            {children}
          </main>
        </div>
      </div>
    </OnboardingGate>
  );
}
