import type { ReactNode } from 'react';
import { CandidatesMobileNav } from '../../../components/candidates/CandidatesMobileNav';
import { CandidatesSidebar } from '../../../components/candidates/CandidatesSidebar';

/**
 * Candidates workspace: secondary sidebar for repository vs onboarding, matching
 * the placement shell layout.
 */
export default function CandidatesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 -my-4 min-w-0 md:-mx-8 md:-my-8">
      <div className="flex min-h-[calc(100dvh-4rem)] w-full items-stretch bg-[var(--ds-canvas)]">
        <CandidatesSidebar />
        <div className="min-w-0 flex-1">
          <div className="w-full px-4 py-4 md:px-6 md:py-5 xl:px-8">
            <CandidatesMobileNav />
            <div className="mt-2 flex flex-col gap-4 md:mt-0">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
