import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PLACEMENT_NAV } from '../lib/tpo-nav';
import { TpoTopbar } from './tpo-topbar';

const navState = vi.hoisted(() => ({ pathname: '/' }));

vi.mock('next/navigation', () => ({
  usePathname: () => navState.pathname,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('../lib/api', () => ({
  api: {
    auth: { me: vi.fn().mockResolvedValue({ fullName: 'Pilot TPO', role: 'INSTITUTION_ADMIN' }) },
    onboarding: { listTpoStudents: vi.fn().mockResolvedValue([]) },
  },
  openingsApi: { list: vi.fn().mockResolvedValue({ openings: [] }) },
}));

function openPlacementMenu() {
  fireEvent.click(screen.getByRole('button', { name: /placement/i }));
}

/** Anchored because each item's accessible name is `label + description`. */
function placementMenuItem(name: string) {
  return screen.getByRole('menuitem', { name: new RegExp(`^${name}`) });
}

beforeEach(() => {
  navState.pathname = '/';
});

afterEach(() => {
  cleanup();
});

describe('TpoTopbar placement navigation', () => {
  it('collapses the Placement menu until it is opened', () => {
    render(<TpoTopbar />);

    const trigger = screen.getByRole('button', { name: /placement/i });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('menu', { name: 'Placement' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: /^Openings/ })).toBeNull();

    fireEvent.click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('menu', { name: 'Placement' })).toBeTruthy();
  });

  it.each(PLACEMENT_NAV.map((link) => [link.name, link.href, link.description] as const))(
    'links %s to %s',
    (name, href, description) => {
      render(<TpoTopbar />);
      openPlacementMenu();

      const link = placementMenuItem(name);
      expect(link.getAttribute('href')).toBe(href);
      expect(link.textContent).toContain(description);
    },
  );

  it('closes the menu on Escape', () => {
    render(<TpoTopbar />);
    openPlacementMenu();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('menu', { name: 'Placement' })).toBeNull();
  });

  it('marks the open placement route as the current page', () => {
    navState.pathname = '/ats';
    render(<TpoTopbar />);
    openPlacementMenu();

    expect(placementMenuItem('ATS').getAttribute('aria-current')).toBe('page');
    expect(placementMenuItem('Review').getAttribute('aria-current')).toBeNull();
  });

  it('keeps a query-scoped suggestions route highlighted', () => {
    navState.pathname = '/suggestions';
    render(<TpoTopbar />);
    openPlacementMenu();

    expect(placementMenuItem('Suggestions').getAttribute('aria-current')).toBe('page');
  });

  it('exposes the placement routes in the mobile drawer', () => {
    render(<TpoTopbar />);

    fireEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }));

    for (const link of PLACEMENT_NAV) {
      expect(screen.getByRole('link', { name: link.name }).getAttribute('href')).toBe(link.href);
    }
  });
});

describe('TpoTopbar existing navigation', () => {
  it.each([
    ['Dashboard', '/'],
    ['Candidates', '/students'],
    ['Onboarding', '/provisioning'],
    ['Reports', '/reports'],
    ['Settings', '/settings'],
  ])('still links %s to %s', (name, href) => {
    render(<TpoTopbar />);

    expect(screen.getByRole('link', { name }).getAttribute('href')).toBe(href);
  });

  it('marks only the dashboard as current on /dashboard', () => {
    navState.pathname = '/dashboard';
    render(<TpoTopbar />);

    expect(screen.getByRole('link', { name: 'Dashboard' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(
      screen.getByRole('link', { name: 'Candidates' }).getAttribute('aria-current'),
    ).toBeNull();
  });

  it('does not link the student applications view', () => {
    render(<TpoTopbar />);
    openPlacementMenu();

    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(hrefs).not.toContain('/applications');
  });
});
