import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sign in · SMART',
  description: 'Login and account setup.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-[var(--surface-muted)] text-[var(--text-primary)] antialiased">
        {children}
      </body>
    </html>
  );
}
