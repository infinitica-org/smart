import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { PortalAuthGate } from '@/components/portal-auth-gate';
import { ThemeProvider } from '@smart/ui/theme-provider';
import { TooltipProvider } from '@smart/ui/tooltip';

export const metadata: Metadata = {
  title: {
    default: 'Company Portal · SMART',
    template: '%s · SMART Employers',
  },
  description: 'Post jobs, find verified students, and manage your hiring pipeline.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="company-canvas min-h-dvh font-sans text-foreground antialiased">
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <PortalAuthGate>{children}</PortalAuthGate>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
