import type { ReactNode } from 'react';

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[#111111] font-sans relative overflow-x-hidden text-white">
      {children}
    </div>
  );
}
