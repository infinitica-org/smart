import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: {
    default: 'TPO Console · SMART',
    template: '%s · SMART TPO',
  },
  description: 'Cohort readiness, JD ingest, shortlists.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="light">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
