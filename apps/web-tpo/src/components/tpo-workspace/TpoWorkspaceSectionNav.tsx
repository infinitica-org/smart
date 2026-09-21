'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { TpoNavLink } from '../../lib/tpo-nav';
import { isNavLinkActive } from '../../lib/tpo-nav';

export type TpoWorkspaceSectionNavProps = {
  sectionTitle: string;
  sectionDescription?: string;
  items: TpoNavLink[];
  navAriaLabel: string;
};

/**
 * Product-level subsection switcher: section label, text tabs, teal underline — no pills/cards.
 */
export function TpoWorkspaceSectionNav({
  sectionTitle,
  sectionDescription,
  items,
  navAriaLabel,
}: TpoWorkspaceSectionNavProps) {
  const pathname = usePathname();

  return (
    <div className="tpo-workspace-section mb-5 border-b border-[var(--tpo-section-nav-divider,#e2e8f0)] pb-0">
      <p className="text-[13px] font-semibold tracking-tight text-[var(--ds-text)]">
        {sectionTitle}
      </p>
      {sectionDescription ? (
        <p className="mt-0.5 max-w-2xl text-[12px] leading-relaxed text-[var(--tpo-section-nav-idle,#64748b)]">
          {sectionDescription}
        </p>
      ) : null}

      <nav aria-label={navAriaLabel} className="mt-3">
        <ul className="-mb-px flex gap-6 overflow-x-auto [scrollbar-width:none] sm:gap-8 [&::-webkit-scrollbar]:hidden">
          {items.map((item) => {
            const active = isNavLinkActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`group relative inline-flex items-center gap-1.5 pb-3 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ds-text)] ${
                    active
                      ? 'font-semibold text-[var(--tpo-section-nav-active,#172033)]'
                      : 'font-medium text-[var(--tpo-section-nav-idle,#64748b)] hover:text-[var(--tpo-section-nav-hover,#334155)]'
                  }`}
                >
                  {Icon ? (
                    <Icon
                      className={`size-3.5 shrink-0 stroke-[1.5] ${
                        active
                          ? 'text-[var(--tpo-section-nav-underline,#0f9f8f)]'
                          : 'text-[var(--ds-text-subtle)] opacity-70 group-hover:opacity-100'
                      }`}
                      aria-hidden
                    />
                  ) : null}
                  {item.name}
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[var(--tpo-section-nav-underline,#0f9f8f)]"
                    />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
