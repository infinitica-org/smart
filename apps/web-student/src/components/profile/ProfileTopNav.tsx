'use client';

import { motion } from 'motion/react';
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
      className={`min-w-0 max-w-full font-sans select-none ${className ?? ''}`}
    >
      <div className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-md border border-zinc-200/90 bg-white p-1.5 shadow-2xs dark:border-zinc-800 dark:bg-[#161616] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = item.id === activeSection;
          const Icon = item.icon;
          const visibleLabel = item.navLabel ?? item.label;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              data-active={active ? 'true' : undefined}
              className={`relative z-10 flex shrink-0 items-center gap-1.5 rounded-md px-4 py-2 text-xs sm:text-sm font-medium transition-colors duration-150 ${
                active
                  ? 'font-bold text-white dark:text-zinc-950'
                  : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="active-profile-tab"
                  className="absolute inset-0 -z-10 rounded-md bg-zinc-950 shadow-xs dark:bg-white"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <Icon className="size-3.5 stroke-[1.75]" />
              <span>{visibleLabel}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
