import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Users, UserPlus, LayoutGrid } from 'lucide-react';
import { TpoWorkspaceSectionNav } from './TpoWorkspaceSectionNav';

const navState = vi.hoisted(() => ({ pathname: '/students' }));

vi.mock('next/navigation', () => ({
  usePathname: () => navState.pathname,
}));

const items = [
  {
    name: 'Candidates Repository',
    href: '/students',
    description: '',
    icon: Users,
  },
  {
    name: 'Candidate Onboarding',
    href: '/provisioning',
    description: '',
    icon: UserPlus,
  },
  { name: 'Batches', href: '/batches', description: '', icon: LayoutGrid },
];

beforeEach(() => {
  navState.pathname = '/students';
});

afterEach(() => {
  cleanup();
});

describe('TpoWorkspaceSectionNav', () => {
  it('renders section title and text links without pill chrome', () => {
    render(
      <TpoWorkspaceSectionNav
        sectionTitle="Candidates"
        items={items}
        navAriaLabel="Candidates sections"
      />,
    );

    expect(screen.getByText('Candidates')).toBeDefined();
    expect(screen.getByRole('link', { name: /Candidates Repository/ }).getAttribute('href')).toBe(
      '/students',
    );
    expect(screen.getByRole('link', { name: /Candidate Onboarding/ }).getAttribute('href')).toBe(
      '/provisioning',
    );
  });

  it('marks the active route', () => {
    navState.pathname = '/provisioning';
    render(
      <TpoWorkspaceSectionNav
        sectionTitle="Candidates"
        items={items}
        navAriaLabel="Candidates sections"
      />,
    );

    expect(
      screen.getByRole('link', { name: /Candidate Onboarding/ }).getAttribute('aria-current'),
    ).toBe('page');
  });
});
