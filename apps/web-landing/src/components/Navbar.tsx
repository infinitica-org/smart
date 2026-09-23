'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';

import textLogo from '@smart/ui/assets/images/Logos/WebP/Text-logo.png';
import { authLoginUrl, authSignUpUrl, verifyHomeUrl } from '@/lib/portal-urls';

type NavLink = {
  name: string;
  href: string;
  external?: boolean;
};

export default function Navbar() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const navLinks: NavLink[] = [
    { name: 'Employers', href: '#employers' },
    { name: 'Job seekers', href: '#job-seekers' },
    { name: 'Universities', href: '#universities' },
    { name: 'Verified profiles', href: verifyHomeUrl(), external: true },
  ];

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[9999] flex justify-center px-4 pt-4 sm:px-6 sm:pt-5">
      <motion.header
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-auto w-full max-w-5xl rounded-2xl border border-white/60 bg-white/75 shadow-[0_12px_40px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl sm:rounded-full"
      >
        <nav
          aria-label="Main"
          className="flex h-14 items-center justify-between gap-3 px-4 sm:h-[3.25rem] sm:px-5"
        >
          <Link
            href="/"
            className="flex shrink-0 items-center transition-transform hover:scale-[1.02]"
            aria-label="SMART home"
          >
            <Image src={textLogo} alt="SMART" priority className="h-6 w-auto sm:h-7" />
          </Link>

          <div
            className="absolute left-1/2 hidden -translate-x-1/2 items-center rounded-full border border-slate-200/80 bg-slate-50/90 p-1 lg:flex"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {navLinks.map((link, i) => {
              const className =
                'relative rounded-full px-3.5 py-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:text-slate-900 xl:px-4 xl:text-sm';

              const label = (
                <>
                  {hoveredIndex === i && (
                    <motion.span
                      layoutId="nav-highlight"
                      className="absolute inset-0 rounded-full bg-white shadow-sm ring-1 ring-slate-200/80"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
                    />
                  )}
                  <span className="relative z-10">{link.name}</span>
                </>
              );

              if (link.external) {
                return (
                  <a
                    key={link.name}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseEnter={() => setHoveredIndex(i)}
                    className={className}
                  >
                    {label}
                  </a>
                );
              }

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onMouseEnter={() => setHoveredIndex(i)}
                  className={className}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <a
              href={authLoginUrl()}
              className="hidden rounded-full px-3.5 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-100/80 hover:text-slate-900 sm:inline-flex xl:text-sm"
            >
              Log in
            </a>
            <a
              href={authSignUpUrl()}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#00fad0] to-[#0d9488] px-4 py-2 text-[13px] font-semibold text-slate-900 shadow-[0_4px_14px_rgba(0,250,208,0.35)] transition-all hover:brightness-105 hover:shadow-[0_6px_20px_rgba(0,250,208,0.45)] xl:text-sm"
            >
              Sign up
            </a>
          </div>
        </nav>
      </motion.header>
    </div>
  );
}
