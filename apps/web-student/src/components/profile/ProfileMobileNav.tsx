'use client';

import { PROFILE_SECTION_NAV, type ProfileSectionId } from '@/lib/profile-sections';

interface ProfileMobileNavProps {
  activeSection: ProfileSectionId;
  onSelect: (section: ProfileSectionId) => void;
}

export function ProfileMobileNav({ activeSection, onSelect }: ProfileMobileNavProps) {
  const items = PROFILE_SECTION_NAV.flatMap((group) => group.items);

  return (
    <nav aria-label="Profile sections" className="lg:hidden">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = item.id === activeSection;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition duration-150 ${
                active
                  ? 'border-[#00967C] bg-[#EAF9F5] text-[#008F7A]'
                  : 'border-[#E2E8F0] bg-white text-[#334155]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
