import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Employer Portal · SMART',
    template: '%s · SMART Employers',
  },
  description: 'Post jobs, find verified students, and manage your hiring pipeline.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="light">
      <body>{children}</body>
    </html>
  );
}
