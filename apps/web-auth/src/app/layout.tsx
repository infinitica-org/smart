import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { SessionBootstrap } from '@smart/ui';
import { AuthSessionBar } from '../components/auth-session-bar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sign in · SMART',
  description: 'Login and account setup.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-[var(--surface-muted)] text-[var(--text-primary)] antialiased">
        <SessionBootstrap>
          <AuthSessionBar />
          {children}
        </SessionBootstrap>
      </body>
    </html>
  );
}
