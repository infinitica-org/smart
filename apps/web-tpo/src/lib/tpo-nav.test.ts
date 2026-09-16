import { describe, expect, it } from 'vitest';
import {
  PLACEMENT_NAV,
  PLACEMENT_NAV_GROUPS,
  TPO_NAV,
  isNavItemActive,
  isNavLinkActive,
  isPlacementRoute,
} from './tpo-nav';
import type { TpoNavItem } from './tpo-nav';

function navItem(name: string): TpoNavItem {
  const item = TPO_NAV.find((entry) => entry.name === name);
  if (!item) throw new Error(`No TPO nav item named ${name}`);
  return item;
}

const placementGroup = navItem('Placement');
const candidatesItem = navItem('Candidates');

describe('TPO_NAV', () => {
  it('keeps the existing top-level items and slots Placement before Reports', () => {
    expect(TPO_NAV.map((item) => item.name)).toEqual([
      'Dashboard',
      'Candidates',
      'Onboarding',
      'Placement',
      'Reports',
      'Settings',
    ]);
  });

  it('groups the six existing placement routes under Placement', () => {
    expect(PLACEMENT_NAV.map((link) => [link.name, link.href])).toEqual([
      ['Openings', '/openings'],
      ['Suggestions', '/suggestions'],
      ['Opportunities', '/opportunities'],
      ['ATS', '/ats'],
      ['Review', '/review'],
      ['Company Dashboard', '/company'],
    ]);
  });

  it('groups sidebar items without inventing an overview route', () => {
    expect(PLACEMENT_NAV_GROUPS.map((group) => group.groupLabel)).toEqual([
      'Job Management',
      'Candidate Discovery',
      'Pipeline',
      'Company',
    ]);
  });

  it('never links the student-facing applications view', () => {
    const hrefs = TPO_NAV.flatMap((item) =>
      item.kind === 'group' ? item.children.map((child) => child.href) : [item.href],
    );

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

  it('does not match routes that merely share a prefix', () => {
    expect(isNavLinkActive('/atsomething', '/ats')).toBe(false);
    expect(isNavLinkActive('/reports', '/review')).toBe(false);
  });
});

describe('isNavItemActive', () => {
  it.each(PLACEMENT_NAV.map((link) => link.href))('marks Placement active on %s', (href) => {
    expect(isNavItemActive(href, placementGroup)).toBe(true);
  });

  it.each(['/', '/students', '/provisioning', '/reports', '/settings'])(
    'leaves Placement inactive on %s',
    (pathname) => {
      expect(isNavItemActive(pathname, placementGroup)).toBe(false);
    },
  );

  it('keeps leaf items matching their own route', () => {
    expect(isNavItemActive('/students', candidatesItem)).toBe(true);
    expect(isNavItemActive('/ats', candidatesItem)).toBe(false);
  });
});

describe('isPlacementRoute', () => {
  it.each(PLACEMENT_NAV.map((link) => link.href))('is true for %s', (href) => {
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
