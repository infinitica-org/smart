'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/signup' || pathname === '/login';

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[var(--ds-canvas)] px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-0 h-[380px] w-[720px] -translate-x-1/2 rounded-full bg-[var(--co-mint-soft)] opacity-80 blur-3xl"
      />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
