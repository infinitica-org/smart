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
  isStudentsTopNavActive,
  isWhitelistTopNavActive,
} from './tpo-nav';

const employersLink = TPO_NAV.find((item) => item.name === 'Employers');

describe('TPO_NAV', () => {
  it('uses university wireframe labels in the topbar', () => {
    expect(TPO_NAV.map((item) => item.name)).toEqual([
      'Dashboard',
      'Students',
      'Whitelist',
      'Employers',
      'Messages',
      'Reports',
    ]);
    expect(employersLink).toMatchObject({ kind: 'link', href: '/companies' });
  });

  it('lists placement sidebar routes including company repository', () => {
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

  it('lists candidates workspace routes without whitelist upload', () => {
    expect(CANDIDATES_NAV.map((link) => link.href)).toEqual(['/students', '/batches']);
  });
});

describe('isStudentsTopNavActive', () => {
  it('is active on students and batches routes', () => {
    expect(isStudentsTopNavActive('/students')).toBe(true);
    expect(isStudentsTopNavActive('/batches')).toBe(true);
    expect(isStudentsTopNavActive('/onboarding')).toBe(false);
  });
});

describe('isWhitelistTopNavActive', () => {
  it('is active on whitelist hub and onboarding', () => {
    expect(isWhitelistTopNavActive('/whitelist')).toBe(true);
    expect(isWhitelistTopNavActive('/onboarding')).toBe(true);
    expect(isWhitelistTopNavActive('/provisioning')).toBe(true);
    expect(isWhitelistTopNavActive('/students')).toBe(false);
  });
});

describe('isCandidatesTopNavActive', () => {
  it('is active on students and batches only', () => {
    expect(isCandidatesTopNavActive('/students')).toBe(true);
    expect(isCandidatesTopNavActive('/batches')).toBe(true);
    expect(isCandidatesTopNavActive('/whitelist')).toBe(false);
  });
});

describe('isPlacementTopNavActive', () => {
  it('is active on the repository landing and placement shell routes', () => {
    expect(isPlacementTopNavActive('/companies')).toBe(true);
    expect(isPlacementTopNavActive('/openings')).toBe(true);
    expect(isPlacementTopNavActive('/students')).toBe(false);
  });
});

describe('isNavLinkActive', () => {
  it('matches exact paths and prefix paths', () => {
    expect(isNavLinkActive('/students/abc', '/students')).toBe(true);
    expect(isNavLinkActive('/openings', '/openings')).toBe(true);
    expect(isNavLinkActive('/openings/create', '/openings')).toBe(false);
  });
});

describe('isNavItemActive', () => {
  it('resolves dashboard on /dashboard alias', () => {
    const dashboard = TPO_NAV.find((item) => item.name === 'Dashboard');
    expect(dashboard).toBeDefined();
    if (dashboard?.kind === 'link') {
      expect(isNavItemActive('/dashboard', dashboard)).toBe(true);
    }
  });
});

describe('isPlacementRoute', () => {
  it('includes companies and placement nav hrefs', () => {
    expect(isPlacementRoute('/companies')).toBe(true);
    expect(isPlacementRoute('/suggestions')).toBe(true);
  });
});

describe('isCandidatesRoute', () => {
  it('is true for candidates workspace routes', () => {
    expect(isCandidatesRoute('/students')).toBe(true);
    expect(isCandidatesRoute('/whitelist')).toBe(false);
    expect(isCandidatesRoute('/companies')).toBe(false);
  });
});
