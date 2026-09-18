import type { ReactNode } from 'react';
import { PlacementMobileNav } from '../../../components/placement/PlacementMobileNav';
import { PlacementSidebar } from '../../../components/placement/PlacementSidebar';

/**
 * Placement workspace: global topbar stays above, a secondary sidebar scopes the
 * six existing placement routes. Negative margins cancel the shell's `main`
 * padding so the sidebar border meets the topbar flush.
 */
export default function PlacementLayout({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 -my-4 min-w-0 md:-mx-8 md:-my-8">
      <div className="flex w-full items-stretch bg-[var(--ds-canvas)] min-h-[calc(100dvh-4rem)]">
        <PlacementSidebar />
        <div className="min-w-0 flex-1">
          <div className="w-full px-4 py-4 md:px-6 md:py-5 xl:px-8">
            <PlacementMobileNav />
            <div className="mt-2 flex flex-col gap-4 md:mt-0">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
