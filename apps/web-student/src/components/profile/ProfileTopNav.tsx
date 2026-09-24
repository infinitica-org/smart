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
      <div className="flex items-center gap-1 overflow-x-auto rounded-md border border-zinc-200/80 bg-zinc-100/75 p-1 dark:border-zinc-800 dark:bg-zinc-900/80 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
              className={`relative z-10 flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors duration-150 ${
                active
                  ? 'font-bold text-zinc-950 dark:text-white'
                  : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="active-profile-tab"
                  className="absolute inset-0 -z-10 rounded-md border border-zinc-200/80 bg-white shadow-2xs dark:border-zinc-700/80 dark:bg-zinc-800"
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
