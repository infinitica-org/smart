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

describe('TpoTopbar placement navigation', () => {
  it('links Placement directly to the company repository', () => {
    render(<TpoTopbar />);

    const placement = screen.getByRole('link', { name: 'Placement' });
    expect(placement.getAttribute('href')).toBe('/companies');
    expect(screen.queryByRole('menu', { name: 'Placement' })).toBeNull();
  });

  it('marks Placement active on any placement workspace route', () => {
    navState.pathname = '/openings/create';
    render(<TpoTopbar />);

    expect(screen.getByRole('link', { name: 'Placement' }).getAttribute('aria-current')).toBe(
      'page',
    );
  });

  it('includes Placement in the mobile drawer', () => {
    render(<TpoTopbar />);
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

    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(hrefs).not.toContain('/applications');
  });
});
