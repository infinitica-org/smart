import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { SessionBootstrap, SMART_HTML_CLASS } from '@smart/ui';
import { PortalHeader } from '../components/portal-header';
import './globals.css';

export const metadata: Metadata = {
  title: 'TPO console · SMART',
  description: 'Cohort readiness, JD ingest, shortlists.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={SMART_HTML_CLASS}>
      <body>
        <SessionBootstrap>
          <PortalHeader />
          {children}
        </SessionBootstrap>
      </body>
    </html>
  );
}
