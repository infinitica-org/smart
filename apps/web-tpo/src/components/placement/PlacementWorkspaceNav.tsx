'use client';

import { PLACEMENT_NAV } from '../../lib/tpo-nav';
import { TpoWorkspaceSectionNav } from '../tpo-workspace/TpoWorkspaceSectionNav';

export function PlacementWorkspaceNav() {
  return (
    <TpoWorkspaceSectionNav
      sectionTitle="Placement"
      sectionDescription="Company profiles, job postings, candidate pipeline, and review."
      items={PLACEMENT_NAV}
      navAriaLabel="Placement sections"
    />
  );
}
