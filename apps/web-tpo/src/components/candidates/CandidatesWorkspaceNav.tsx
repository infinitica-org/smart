'use client';

import { CANDIDATES_NAV } from '../../lib/tpo-nav';
import { TpoWorkspaceSectionNav } from '../tpo-workspace/TpoWorkspaceSectionNav';

export function CandidatesWorkspaceNav() {
  return (
    <TpoWorkspaceSectionNav
      sectionTitle="Candidates"
      sectionDescription="Review students and manage cohort batches."
      items={CANDIDATES_NAV}
      navAriaLabel="Candidates sections"
    />
  );
}
