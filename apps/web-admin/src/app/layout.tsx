import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Platform admin · SMART',
  description: 'Integrity queue, AI health, cut scores.',
};

import { AdminSidebar } from '../components/admin-sidebar';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-dvh bg-[var(--surface-muted)] text-[var(--text-primary)] antialiased flex animate-fade-in">
        <AdminSidebar />
        <main className="flex-1 p-8 overflow-y-auto w-full">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
