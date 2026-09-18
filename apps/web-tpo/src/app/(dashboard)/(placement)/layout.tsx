import type { ReactNode } from 'react';
import { PlacementMobileNav } from '../../../components/placement/PlacementMobileNav';

/**
 * Placement workspace: global topbar above, horizontal pill sub-nav, then page content.
 */
export default function PlacementLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0">
      <PlacementMobileNav />
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </div>
  );
}
