import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@smart/ui/theme-provider';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Student portal · SMART',
  description: 'Track enrolment, L1-L5 player, results.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider defaultTheme="light" enableSystem={false} storageKey="smart-student-theme">
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
