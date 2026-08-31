import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { SMART_HTML_CLASS } from '@smart/ui';
import './globals.css';
import { AdminShell } from '../components/admin-shell';

export const metadata: Metadata = {
  title: 'Platform admin · SMART',
  description: 'Integrity queue, AI health, cut scores.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={SMART_HTML_CLASS}>
      <body className="min-h-dvh bg-[var(--surface-muted)] text-[var(--text-primary)] antialiased flex animate-fade-in">
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
