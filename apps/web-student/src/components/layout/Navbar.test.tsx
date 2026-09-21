import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as CandidateIdentity from '@/lib/candidate-identity';
import { Navbar } from './Navbar';

const navState = vi.hoisted(() => ({ pathname: '/dashboard' }));

vi.mock('next/navigation', () => ({
  usePathname: () => navState.pathname,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/candidate-identity', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof CandidateIdentity;
  return {
    ...actual,
    useCurrentUser: () => ({
      data: { fullName: 'Alex Candidate', email: 'alex@school.edu' },
    }),
  };
});

vi.mock('@/lib/auth', () => ({
  signOut: vi.fn(),
}));

beforeEach(() => {
  navState.pathname = '/dashboard';
});

afterEach(() => {
  cleanup();
});

describe('Navbar brand', () => {
  it('shows the SMART mark and PRO badge like the TPO topbar', () => {
    render(<Navbar />);
    expect(screen.getByRole('link', { name: 'SMART home' }).getAttribute('href')).toBe(
      '/dashboard',
    );
    expect(screen.getByRole('img', { name: 'SMART' })).toBeDefined();
    expect(screen.getByText('PRO')).toBeDefined();
  });
});

describe('Navbar visual active states', () => {
  it('lists Assessment, Interview, and Jobs without Skill Repository', () => {
    render(<Navbar />);
    expect(screen.getByRole('link', { name: 'Assessment' }).getAttribute('href')).toBe(
      '/assessment',
    );
    expect(screen.getByRole('link', { name: 'Interview' }).getAttribute('href')).toBe('/interview');
    expect(screen.getByRole('link', { name: 'Jobs' }).getAttribute('href')).toBe('/jobs');
    expect(screen.queryByRole('link', { name: 'Skill Repository' })).toBeNull();
  });

  it.each([
    ['/dashboard', 'Home'],
    ['/assessment', 'Assessment'],
    ['/profile', 'Profile'],
  ] as const)('renders a single bottom underline for %s → %s', (pathname, label) => {
    navState.pathname = pathname;
    render(<Navbar />);

    expect(screen.getAllByTestId('topbar-nav-active-indicator')).toHaveLength(1);
    expect(screen.getByRole('link', { name: label }).getAttribute('aria-current')).toBe('page');
  });

  it('does not render a theme toggle in the top bar', () => {
    render(<Navbar />);
    expect(screen.queryByRole('button', { name: /theme|dark mode|light mode/i })).toBeNull();
  });

  it('does not use green/teal text for active primary nav links', () => {
    const { container } = render(<Navbar />);
    const nav = container.querySelector('nav[aria-label="Candidate console"]');
    expect(nav?.innerHTML).not.toMatch(/ds-green/);
    expect(nav?.innerHTML).not.toMatch(/008f7a/);
  });
});
