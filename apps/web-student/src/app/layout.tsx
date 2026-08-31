import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { SMART_HTML_CLASS } from '@smart/ui';
import './globals.css';
import { Providers } from './providers';
import { PortalHeader } from '../components/portal-header';

export const metadata: Metadata = {
  title: 'Student portal · SMART',
  description: 'Track enrolment, L1-L5 player, results.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={SMART_HTML_CLASS}>
      <body>
        <Providers>
          <PortalHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
