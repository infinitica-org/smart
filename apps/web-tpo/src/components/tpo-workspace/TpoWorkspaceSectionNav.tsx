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
    <div className="tpo-workspace-section mb-6 border-b border-zinc-200/80 pb-0">
      {sectionTitle ? (
        <div className="mb-4">
          <h1 className="font-heading text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
            {sectionTitle}
          </h1>
          {sectionDescription ? (
            <p className="mt-1 text-xs sm:text-sm font-medium text-zinc-500">
              {sectionDescription}
            </p>
          ) : null}
        </div>
      ) : null}

      <nav aria-label={navAriaLabel}>
        <ul className="-mb-px flex gap-6 overflow-x-auto [scrollbar-width:none] sm:gap-8 [&::-webkit-scrollbar]:hidden">
          {items.map((item) => {
            const active = isNavLinkActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`group relative inline-flex items-center gap-1.5 pb-2.5 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900 ${
                    active ? 'font-bold text-black' : 'font-medium text-zinc-500 hover:text-black'
                  }`}
                >
                  {Icon ? (
                    <Icon
                      className={`size-3.5 shrink-0 stroke-[1.75] ${
                        active ? 'text-black' : 'text-zinc-400 group-hover:text-zinc-700'
                      }`}
                      aria-hidden
                    />
                  ) : null}
                  {item.name}
                  {active ? (
                    <span aria-hidden className="absolute inset-x-0 -bottom-px h-[2px] bg-black" />
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
