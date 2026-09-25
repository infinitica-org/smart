import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { PortalAuthGate } from '../components/portal-auth-gate';
import { ThemeProvider } from '@smart/ui/theme-provider';
import { Toaster } from '@smart/ui/sonner';
import { TooltipProvider } from '@smart/ui/tooltip';

export const metadata: Metadata = {
  title: 'Platform admin · SMART',
  description: 'Integrity queue, AI health, cut scores.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className="relative min-h-dvh bg-[var(--ds-canvas,#ffffff)] font-sans text-[var(--ds-text,#101828)] antialiased">
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <PortalAuthGate>{children}</PortalAuthGate>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
