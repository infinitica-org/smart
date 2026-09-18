import type { ReactNode } from 'react';
import { PlacementWorkspaceNav } from '../../../components/placement/PlacementWorkspaceNav';

/** Placement workspace: topbar → section rail → page content. */
export default function PlacementLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0">
      <PlacementWorkspaceNav />
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}
