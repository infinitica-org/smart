import { describe, expect, it } from 'vitest';
import {
  CANDIDATES_NAV,
  PLACEMENT_NAV,
  PLACEMENT_NAV_GROUPS,
  TPO_NAV,
  isCandidatesRoute,
  isCandidatesTopNavActive,
  isNavItemActive,
  isNavLinkActive,
  isPlacementRoute,
  isPlacementTopNavActive,
} from './tpo-nav';

const placementLink = TPO_NAV.find((item) => item.name === 'Placement');
const candidatesItem = TPO_NAV.find((item) => item.name === 'Candidates');

describe('TPO_NAV', () => {
  it('keeps top-level items with Placement as a direct link to the company repository', () => {
    expect(TPO_NAV.map((item) => item.name)).toEqual([
      'Dashboard',
      'Candidates',
      'Placement',
      'Reports',
      'Settings',
    ]);
    expect(placementLink).toMatchObject({ kind: 'link', href: '/companies' });
  });

  it('lists placement sidebar routes including company repository', () => {
    // ATS and Company Dashboard are WIP and temporarily hidden from the sidebar.
    expect(PLACEMENT_NAV.map((link) => [link.name, link.href])).toEqual([
      ['Company Repository', '/companies'],
      ['Create Job Posting', '/openings/create'],
      ['Listed Openings', '/openings'],
      ['Suggestions', '/suggestions'],
      ['Applications', '/opportunities'],
      ['Review', '/review'],
    ]);
  });

  it('groups sidebar items under four sections', () => {
    expect(PLACEMENT_NAV_GROUPS.map((group) => group.groupLabel)).toEqual([
      'Company',
      'Job Management',
      'Candidate Discovery',
      'Pipeline',
    ]);
  });

  it('lists candidates sidebar routes for repository and onboarding', () => {
    expect(CANDIDATES_NAV.map((link) => [link.name, link.href])).toEqual([
      ['Candidates Repository', '/students'],
      ['Candidate Onboarding', '/provisioning'],
      ['Batches', '/batches'],
    ]);
  });

  it('never links the student-facing applications view', () => {
    const hrefs = TPO_NAV.map((item) => (item.kind === 'link' ? item.href : '')).filter(Boolean);
    expect(hrefs).not.toContain('/applications');
  });
});

describe('isNavLinkActive', () => {
  it('treats / and /dashboard as the dashboard, not a prefix of every route', () => {
    expect(isNavLinkActive('/', '/')).toBe(true);
    expect(isNavLinkActive('/dashboard', '/')).toBe(true);
    expect(isNavLinkActive('/openings', '/')).toBe(false);
  });

  it('matches the route and its nested segments', () => {
    expect(isNavLinkActive('/openings', '/openings')).toBe(true);
    expect(isNavLinkActive('/suggestions/abc', '/suggestions')).toBe(true);
  });

  it('does not treat /openings/create as listed openings', () => {
    expect(isNavLinkActive('/openings/create', '/openings')).toBe(false);
    expect(isNavLinkActive('/openings/create', '/openings/create')).toBe(true);
  });

  it('does not match routes that merely share a prefix', () => {
    expect(isNavLinkActive('/atsomething', '/ats')).toBe(false);
    expect(isNavLinkActive('/reports', '/review')).toBe(false);
  });
});

describe('isPlacementTopNavActive', () => {
  it('is active on the repository landing and placement shell routes', () => {
    expect(isPlacementTopNavActive('/companies')).toBe(true);
    expect(isPlacementTopNavActive('/openings/create')).toBe(true);
    expect(isPlacementTopNavActive('/students')).toBe(false);
  });
});

describe('isCandidatesTopNavActive', () => {
  it('is active on repository and onboarding routes', () => {
    expect(isCandidatesTopNavActive('/students')).toBe(true);
    expect(isCandidatesTopNavActive('/provisioning')).toBe(true);
    expect(isCandidatesTopNavActive('/reports')).toBe(false);
  });
});

describe('isNavItemActive', () => {
  it('keeps leaf items matching their own route', () => {
    if (!candidatesItem || candidatesItem.kind !== 'link')
      throw new Error('Candidates nav missing');
    expect(isNavItemActive('/students', candidatesItem)).toBe(true);
    expect(isNavItemActive('/ats', candidatesItem)).toBe(false);
  });
});

describe('isCandidatesRoute', () => {
  it.each(['/students', '/provisioning', '/batches', '/batches/batch-1'])(
    'is true for %s',
    (href) => {
      expect(isCandidatesRoute(href)).toBe(true);
    },
  );

  it('is false for placement and dashboard routes', () => {
    expect(isCandidatesRoute('/openings')).toBe(false);
    expect(isCandidatesRoute('/')).toBe(false);
  });
});

describe('isPlacementRoute', () => {
  it.each([...PLACEMENT_NAV.map((link) => link.href), '/companies'])('is true for %s', (href) => {
    expect(isPlacementRoute(href)).toBe(true);
  });

  it('is true for a nested suggestions path', () => {
    expect(isPlacementRoute('/suggestions/abc')).toBe(true);
  });

  it.each(['/', '/students', '/provisioning', '/reports', '/settings', '/applications'])(
    'is false for %s',
    (pathname) => {
      expect(isPlacementRoute(pathname)).toBe(false);
    },
  );
});
