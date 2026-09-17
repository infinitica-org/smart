'use client';

import { PROFILE_SECTION_NAV, type ProfileSectionId } from '@/lib/profile-sections';

interface ProfileSidebarProps {
  activeSection: ProfileSectionId;
  onSelect: (section: ProfileSectionId) => void;
}

const SIDEBAR_WIDTH_CLASS = 'w-[224px]';
const NAVBAR_OFFSET = 'top-[4.25rem]';
const SIDEBAR_HEIGHT = 'h-[calc(100dvh-4.25rem)]';

export function ProfileSidebar({ activeSection, onSelect }: ProfileSidebarProps) {
  return (
    <div className={`hidden shrink-0 ${SIDEBAR_WIDTH_CLASS} lg:block`}>
      <nav
        aria-label="Profile sections"
        className={`fixed left-0 z-20 ${NAVBAR_OFFSET} ${SIDEBAR_HEIGHT} ${SIDEBAR_WIDTH_CLASS} border-r border-[var(--ds-border)] bg-[var(--ds-surface)]`}
      >
        <div className="flex h-full flex-col overflow-y-auto px-3 py-5 [scrollbar-color:#E2E8F0_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#E2E8F0] [&::-webkit-scrollbar-track]:bg-transparent">
          <div className="flex flex-col gap-6">
            {PROFILE_SECTION_NAV.map((group) => (
              <div key={group.groupLabel}>
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.11em] text-[var(--ds-text-subtle)]">
                  {group.groupLabel}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const active = item.id === activeSection;
                    const Icon = item.icon;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(item.id)}
                          aria-current={active ? 'page' : undefined}
                          className={`group relative flex h-10 w-full items-center gap-2.5 rounded-[10px] px-3 text-left text-[14px] font-medium transition-[background-color,color] duration-150 ease-out ${
                            active
                              ? 'bg-[var(--ds-nav-active-bg)] font-semibold text-[var(--ds-green)] before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-[var(--ds-green)] before:content-[""]'
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
                          {item.label}
                        </button>
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
    </div>
  );
}
