import type { ReactNode } from 'react';
import { CandidatesWorkspaceNav } from '../../../components/candidates/CandidatesWorkspaceNav';

/** Candidates workspace: topbar → section rail → page content. */
export default function CandidatesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0">
      <CandidatesWorkspaceNav />
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}
