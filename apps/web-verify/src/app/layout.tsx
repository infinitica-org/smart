import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { SMART_HTML_CLASS, SmartLogo } from '@smart/ui';
import './globals.css';

export const metadata: Metadata = {
  title: 'Certificate verification · SMART',
  description: 'Public anonymous lookup. No account required.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={SMART_HTML_CLASS}>
      <body className="min-h-dvh bg-[var(--surface-muted)] text-[var(--text-primary)] antialiased animate-fade-in">
        <header className="border-b border-[var(--surface-border)] bg-[var(--surface)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
            <div>
              <SmartLogo kind="wordmark" className="h-7" />
              <h1 className="mt-2 text-xl font-semibold tracking-tight">Trust & Verification</h1>
            </div>
            <div className="text-xs text-[var(--text-muted)] font-medium">Public Lookup Portal</div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>

        <footer className="mx-auto max-w-6xl border-t border-[var(--surface-border)] px-6 py-8 text-center text-xs text-[var(--text-muted)]">
          <p>© 2026 SMART Platform. All rights reserved.</p>
          <p className="mt-1">
            Certified credentials are cryptographically signed with the platform authority key.
          </p>
        </footer>
      </body>
    </html>
  );
}
