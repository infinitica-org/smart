'use client';

import { CANDIDATES_NAV } from '../../lib/tpo-nav';
import { TpoWorkspaceSectionNav } from '../tpo-workspace/TpoWorkspaceSectionNav';

export function CandidatesWorkspaceNav() {
  return (
    <TpoWorkspaceSectionNav
      sectionTitle="Candidates"
      sectionDescription="Manage candidates, onboarding, and placement cohorts."
      items={CANDIDATES_NAV}
      navAriaLabel="Candidates sections"
    />
  );
}
