'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PLACEMENT_NAV_GROUPS, isNavLinkActive } from '../../lib/tpo-nav';
import { sectionLabelClass } from '../../lib/tpo-ui';

/**
 * Sticky rather than fixed: the TPO shell centres `main` at max-w-[1440px], so a
 * viewport-anchored sidebar would detach from the content on wide screens.
 */
export function PlacementSidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Placement sections"
      className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-[232px] shrink-0 self-start border-r border-[var(--ds-border)] bg-[var(--ds-surface)] lg:block"
    >
      <div className="flex h-full flex-col overflow-y-auto px-3 py-5 [scrollbar-color:#E2E8F0_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#E2E8F0] [&::-webkit-scrollbar-track]:bg-transparent">
        <div className="mb-6 px-3">
          <p className="text-[13px] font-semibold tracking-tight text-[var(--ds-text)]">
            Placement
          </p>
          <p className="text-[11px] text-[var(--ds-text-muted)]">Placement Operations</p>
        </div>

        <div className="flex flex-col gap-6">
          {PLACEMENT_NAV_GROUPS.map((group) => (
            <div key={group.groupLabel}>
              <p className={`mb-2 px-3 ${sectionLabelClass}`}>{group.groupLabel}</p>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = isNavLinkActive(pathname, item.href);
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={`group relative flex h-10 w-full items-center gap-2.5 rounded-[10px] px-3 text-left text-[14px] font-medium transition-[background-color,color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-text)] ${
                          active
                            ? 'bg-[var(--ds-nav-active-bg)] font-semibold text-[var(--ds-green)] before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-[var(--tpo-accent)] before:content-[""]'
                            : 'text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)]'
                        }`}
                      >
                        <Icon
                          className={`h-[18px] w-[18px] shrink-0 stroke-[1.75] ${
                            active
                              ? 'text-[var(--ds-green)]'
                              : 'text-[var(--ds-text-muted)] group-hover:text-[var(--ds-text-secondary)]'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-auto px-3 pt-6 text-[11px] leading-snug text-[var(--ds-text-subtle)]">
          © SMART. Build. Verify. Grow.
        </p>
      </div>
    </nav>
  );
}
