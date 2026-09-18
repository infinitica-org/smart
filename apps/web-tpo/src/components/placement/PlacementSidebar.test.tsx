import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PLACEMENT_NAV } from '../../lib/tpo-nav';
import { PlacementWorkspaceNav } from './PlacementWorkspaceNav';

const navState = vi.hoisted(() => ({ pathname: '/openings' }));

vi.mock('next/navigation', () => ({
  usePathname: () => navState.pathname,
}));

beforeEach(() => {
  navState.pathname = '/openings';
});

afterEach(() => {
  cleanup();
});

describe('PlacementWorkspaceNav', () => {
  it('exposes placement routes via the section rail', () => {
    render(<PlacementWorkspaceNav />);

    const nav = screen.getByRole('navigation', { name: 'Placement sections' });
    expect(nav).toBeTruthy();

    for (const link of PLACEMENT_NAV) {
      expect(screen.getByRole('link', { name: new RegExp(link.name) }).getAttribute('href')).toBe(
        link.href,
      );
    }
  });

  it('marks the current route as the active page', () => {
    navState.pathname = '/review';
    render(<PlacementWorkspaceNav />);

    expect(screen.getByRole('link', { name: /Review/ }).getAttribute('aria-current')).toBe('page');
    expect(
      screen.getByRole('link', { name: /Suggestions/ }).getAttribute('aria-current'),
    ).toBeNull();
  });

  it('hides the WIP ATS and Company Dashboard entries', () => {
    render(<PlacementWorkspaceNav />);

    expect(screen.queryByRole('link', { name: 'ATS' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Company Dashboard' })).toBeNull();
  });

  it('keeps a query-scoped suggestions route highlighted', () => {
    navState.pathname = '/suggestions';
    render(<PlacementWorkspaceNav />);

    expect(screen.getByRole('link', { name: /Suggestions/ }).getAttribute('aria-current')).toBe(
      'page',
    );
  });

  it('does not link the student applications view', () => {
    render(<PlacementWorkspaceNav />);

    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(hrefs).not.toContain('/applications');
  });
});
