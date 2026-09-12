import type { ReactNode } from 'react';

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-[100dvh] bg-background font-sans text-foreground">{children}</div>;
}
