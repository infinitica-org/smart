import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PLACEMENT_NAV } from '../../lib/tpo-nav';
import { PlacementMobileNav } from './PlacementMobileNav';
import { PlacementSidebar } from './PlacementSidebar';

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

describe('PlacementSidebar', () => {
  it('renders the six existing placement routes', () => {
    render(<PlacementSidebar />);

    const nav = screen.getByRole('navigation', { name: 'Placement sections' });
    expect(nav).toBeTruthy();

    for (const link of PLACEMENT_NAV) {
      expect(screen.getByRole('link', { name: link.name }).getAttribute('href')).toBe(link.href);
    }
  });

  it('marks the current route as the active page', () => {
    navState.pathname = '/review';
    render(<PlacementSidebar />);

    expect(screen.getByRole('link', { name: 'Review' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'ATS' }).getAttribute('aria-current')).toBeNull();
  });

  it('keeps a query-scoped suggestions route highlighted', () => {
    navState.pathname = '/suggestions';
    render(<PlacementSidebar />);

    expect(screen.getByRole('link', { name: 'Suggestions' }).getAttribute('aria-current')).toBe(
      'page',
    );
  });

  it('does not link the student applications view', () => {
    render(<PlacementSidebar />);

    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(hrefs).not.toContain('/applications');
  });
});

describe('PlacementMobileNav', () => {
  it('exposes the six placement routes', () => {
    render(<PlacementMobileNav />);

    for (const link of PLACEMENT_NAV) {
      expect(screen.getByRole('link', { name: link.name }).getAttribute('href')).toBe(link.href);
    }
  });

  it('marks the current route as the active page', () => {
    navState.pathname = '/company';
    render(<PlacementMobileNav />);

    expect(
      screen.getByRole('link', { name: 'Company Dashboard' }).getAttribute('aria-current'),
    ).toBe('page');
  });
});
