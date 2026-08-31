import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { SMART_HTML_CLASS } from '@smart/ui';
import { TpoShell } from '../components/tpo-shell';
import { PortalAuthGate } from '../components/portal-auth-gate';
import './globals.css';

export const metadata: Metadata = {
  title: 'TPO console · SMART',
  description: 'Cohort readiness, JD ingest, shortlists.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={SMART_HTML_CLASS}>
      <body>
        <PortalAuthGate>
          <TpoShell>{children}</TpoShell>
        </PortalAuthGate>
      </body>
    </html>
  );
}
