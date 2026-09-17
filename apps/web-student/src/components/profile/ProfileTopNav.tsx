'use client';

import { PROFILE_SECTION_NAV, type ProfileSectionId } from '@/lib/profile-sections';

interface ProfileTopNavProps {
  activeSection: ProfileSectionId;
  onSelect: (section: ProfileSectionId) => void;
  className?: string;
}

export function ProfileTopNav({ activeSection, onSelect, className }: ProfileTopNavProps) {
  const items = PROFILE_SECTION_NAV.flatMap((group) => group.items);

  return (
    <nav
      aria-label="Profile sections"
      data-testid="profile-top-nav"
      className={`min-w-0 max-w-full ${className ?? ''}`}
    >
      <div className="overflow-x-auto overscroll-x-contain border-b border-[var(--ds-border)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="flex w-full min-w-0 flex-nowrap items-end justify-between gap-x-1 sm:gap-x-2 md:gap-x-2.5 lg:gap-x-3">
          {items.map((item) => {
            const active = item.id === activeSection;
            const Icon = item.icon;
            const visibleLabel = item.navLabel ?? item.label;
            return (
              <li key={item.id} className="min-w-0 shrink">
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  data-active={active ? 'true' : undefined}
                  className={`group relative inline-flex max-w-full items-center gap-1 pb-2 pt-0.5 text-left text-[12px] leading-tight tracking-[-0.02em] transition-colors duration-150 sm:text-[13px] ${
                    active
                      ? 'font-semibold text-[var(--ds-green)]'
                      : 'font-medium text-[var(--ds-text-muted)] hover:text-[var(--ds-text-secondary)]'
                  }`}
                >
                  <Icon
                    className={`size-3.5 shrink-0 stroke-[1.5] sm:size-[15px] ${
                      active
                        ? 'text-[var(--ds-green)]'
                        : 'text-[var(--ds-text-muted)] group-hover:text-[var(--ds-text-secondary)]'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="truncate whitespace-nowrap">{visibleLabel}</span>
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--ds-green)]"
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
