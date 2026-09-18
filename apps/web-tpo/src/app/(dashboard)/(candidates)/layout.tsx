import type { ReactNode } from 'react';
import { CandidatesMobileNav } from '../../../components/candidates/CandidatesMobileNav';

/**
 * Candidates workspace: global topbar above, horizontal pill sub-nav, then page content.
 */
export default function CandidatesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0">
      <CandidatesMobileNav />
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </div>
  );
}
