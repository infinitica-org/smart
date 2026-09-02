import type { ReactNode } from 'react';

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-[100dvh] bg-[#0a0a0a] font-sans text-white">{children}</div>;
}
