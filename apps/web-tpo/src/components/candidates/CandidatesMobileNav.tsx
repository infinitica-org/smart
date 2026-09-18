'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CANDIDATES_NAV, isNavLinkActive } from '../../lib/tpo-nav';

/** Horizontal pill row for candidates routes (all breakpoints; topbar stays global). */
export function CandidatesMobileNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Candidates sections">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CANDIDATES_NAV.map((item) => {
          const active = isNavLinkActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-text)] ${
                active
                  ? 'border-[var(--ds-green)] bg-[var(--ds-nav-active-bg)] text-[var(--ds-green)]'
                  : 'border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text-secondary)]'
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
