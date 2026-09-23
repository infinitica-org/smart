'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CANDIDATES_NAV_GROUPS, isNavLinkActive } from '../../lib/tpo-nav';
import { candidatesSidebarLinkActiveClass } from '../../lib/tpo-dashboard-ui';
import { sectionLabelClass } from '../../lib/tpo-ui';

export function CandidatesSidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Candidates sections"
      className="hidden w-[232px] shrink-0 flex-col border-r border-[var(--ds-border)] bg-[var(--ds-surface)] lg:flex lg:min-h-[calc(100dvh-4rem)] lg:flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col px-3 py-4 [scrollbar-color:#E2E8F0_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#E2E8F0] [&::-webkit-scrollbar-track]:bg-transparent">
        <div className="mb-4 px-3">
          <p className="text-[13px] font-semibold tracking-tight text-[var(--ds-text)]">
            Candidates
          </p>
          <p className="text-[11px] text-[var(--ds-text-muted)]">Roster & batches</p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          {CANDIDATES_NAV_GROUPS.map((group) => (
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
                            ? candidatesSidebarLinkActiveClass
                            : 'text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)]'
                        }`}
                      >
                        <Icon
                          className={`h-[18px] w-[18px] shrink-0 stroke-[1.75] ${
                            active
                              ? 'text-[var(--tpo-dash-primary)]'
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

        <p className="mt-auto shrink-0 px-3 pb-2 pt-4 text-[11px] leading-snug text-[var(--ds-text-subtle)]">
          © SMART. Build. Verify. Grow.
        </p>
      </div>
    </nav>
  );
}
