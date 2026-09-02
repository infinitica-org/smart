import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Providers } from '@/components/providers';
import './globals.css';

const cabinet = localFont({
  src: '../../public/Fonts/Cabinet Grotesk/WEB/fonts/CabinetGrotesk-Variable.woff2',
  variable: '--font-cabinet',
  display: 'swap',
});

const axiforma = localFont({
  src: [
    {
      path: '../../public/Fonts/Axiforma/fonnts.com-Axiforma-Thin.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../public/Fonts/Axiforma/fonnts.com-Axiforma_Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/Fonts/Axiforma/fonnts.com-Axiforma_Medium.ttf',
      weight: '500',
      style: 'normal',
    },
  ],
  variable: '--font-axiforma-face',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Student portal · SMART',
  description: 'Track enrolment, L1-L5 player, results.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${cabinet.variable} ${axiforma.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased [font-variant-ligatures:none]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
