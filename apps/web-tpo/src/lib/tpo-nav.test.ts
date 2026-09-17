import { describe, expect, it } from 'vitest';
import {
  PLACEMENT_NAV,
  PLACEMENT_NAV_GROUPS,
  TPO_NAV,
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
      'Onboarding',
      'Placement',
      'Reports',
      'Settings',
    ]);
    expect(placementLink).toMatchObject({ kind: 'link', href: '/companies' });
  });

  it('lists placement sidebar routes including company repository', () => {
    expect(PLACEMENT_NAV.map((link) => [link.name, link.href])).toEqual([
      ['Create Job Posting', '/openings/create'],
      ['Listed Openings', '/openings'],
      ['Suggestions', '/suggestions'],
      ['Opportunities', '/opportunities'],
      ['ATS', '/ats'],
      ['Review', '/review'],
      ['Company Repository', '/companies'],
      ['Company Dashboard', '/company'],
    ]);
  });

  it('groups sidebar items under four sections', () => {
    expect(PLACEMENT_NAV_GROUPS.map((group) => group.groupLabel)).toEqual([
      'Job Management',
      'Candidate Discovery',
      'Pipeline',
      'Company',
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

describe('isNavItemActive', () => {
  it('keeps leaf items matching their own route', () => {
    if (!candidatesItem || candidatesItem.kind !== 'link')
      throw new Error('Candidates nav missing');
    expect(isNavItemActive('/students', candidatesItem)).toBe(true);
    expect(isNavItemActive('/ats', candidatesItem)).toBe(false);
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
