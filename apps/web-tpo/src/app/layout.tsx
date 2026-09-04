import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { SMART_HTML_CLASS } from '@smart/ui';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'TPO console · SMART',
  description: 'Cohort readiness, JD ingest, shortlists.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={SMART_HTML_CLASS}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
