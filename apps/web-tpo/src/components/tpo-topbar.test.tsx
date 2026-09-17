import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

beforeEach(() => {
  navState.pathname = '/';
});

afterEach(() => {
  cleanup();
});

function renderTopbar() {
  return render(<TpoTopbar />);
}

function activeNavLink(name: string) {
  return screen.getByRole('link', { name });
}

describe('TpoTopbar brand', () => {
  it('shows the black favicon and PRO badge without the smart word', () => {
    const { container } = renderTopbar();
    const brandLink = screen.getByRole('link', { name: 'SMART home' });
    expect(brandLink.getAttribute('href')).toBe('/');
    expect(screen.getByRole('img', { name: 'SMART' })).toBeDefined();
    expect(screen.getByText('PRO')).toBeDefined();
    expect(screen.queryByText('smart')).toBeNull();
    expect(container.querySelector('path[fill="#00fad0"]')).toBeNull();
  });
});

describe('TpoTopbar visual active states', () => {
  it.each([
    ['/', 'Dashboard'],
    ['/students', 'Candidates'],
    ['/provisioning', 'Onboarding'],
    ['/openings/create', 'Placement'],
    ['/reports', 'Reports'],
    ['/settings', 'Settings'],
  ] as const)('renders a single underline for %s → %s', (pathname, label) => {
    navState.pathname = pathname;
    renderTopbar();

    expect(screen.getAllByTestId('topbar-nav-active-indicator')).toHaveLength(1);
    expect(activeNavLink(label).getAttribute('aria-current')).toBe('page');
  });

  it('does not use teal/cyan active nav backgrounds in the header', () => {
    const { container } = renderTopbar();
    const header = container.querySelector('header');
    expect(header?.innerHTML).not.toMatch(/tpo-accent/);
    expect(header?.innerHTML).not.toMatch(/ds-nav-active-bg/);
  });

  it('pins the active underline to the bottom of the nav item track', () => {
    renderTopbar();
    const indicator = screen.getByTestId('topbar-nav-active-indicator');
    expect(indicator.className).toMatch(/h-\[2px\]/);
    expect(indicator.className).toMatch(/bottom-0/);
  });

  it('renders text-only primary nav links without page icons', () => {
    const { container } = renderTopbar();
    const nav = container.querySelector('nav[aria-label="Primary"]');
    expect(nav?.querySelectorAll('a').length).toBe(6);
    expect(nav?.querySelectorAll('svg').length).toBe(0);
  });
});

describe('TpoTopbar placement navigation', () => {
  it('links Placement directly to the company repository', () => {
    renderTopbar();

    const placement = screen.getByRole('link', { name: 'Placement' });
    expect(placement.getAttribute('href')).toBe('/companies');
    expect(screen.queryByRole('menu', { name: 'Placement' })).toBeNull();
  });

  it('marks Placement active on any placement workspace route', () => {
    navState.pathname = '/openings/create';
    renderTopbar();

    expect(screen.getByRole('link', { name: 'Placement' }).getAttribute('aria-current')).toBe(
      'page',
    );
  });

  it('includes Placement in the mobile drawer', () => {
    renderTopbar();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }));

    const placementLinks = screen.getAllByRole('link', { name: 'Placement' });
    expect(placementLinks.every((link) => link.getAttribute('href') === '/companies')).toBe(true);
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
    renderTopbar();

    expect(screen.getByRole('link', { name }).getAttribute('href')).toBe(href);
  });

  it('marks only the dashboard as current on /dashboard', () => {
    navState.pathname = '/dashboard';
    renderTopbar();

    expect(screen.getByRole('link', { name: 'Dashboard' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(
      screen.getByRole('link', { name: 'Candidates' }).getAttribute('aria-current'),
    ).toBeNull();
  });

  it('does not link the student applications view', () => {
    renderTopbar();

    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(hrefs).not.toContain('/applications');
  });
});

describe('TpoTopbar search and profile', () => {
  it('exposes the premium search placeholder and keyboard shortcut hint', () => {
    renderTopbar();

    expect(screen.getByPlaceholderText('Search...')).toBeDefined();
    expect(screen.getByText('⌘K')).toBeDefined();
  });

  it('opens the profile menu on click', () => {
    renderTopbar();

    fireEvent.click(screen.getByRole('button', { name: /Pilot TPO account menu/i }));
    expect(screen.getByRole('button', { name: /Sign out/i })).toBeDefined();
  });

  it('does not show a notifications bell', () => {
    renderTopbar();
    expect(screen.queryByRole('button', { name: 'Notifications' })).toBeNull();
  });
});
