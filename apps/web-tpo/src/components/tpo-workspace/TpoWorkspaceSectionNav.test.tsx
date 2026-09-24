import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Users, LayoutGrid } from 'lucide-react';
import { TpoWorkspaceSectionNav } from './TpoWorkspaceSectionNav';

const navState = vi.hoisted(() => ({ pathname: '/students' }));

vi.mock('next/navigation', () => ({
  usePathname: () => navState.pathname,
}));

const items = [
  {
    name: 'Students',
    href: '/students',
    description: '',
    icon: Users,
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
    expect(screen.getByRole('link', { name: /^Students$/ }).getAttribute('href')).toBe('/students');
    expect(screen.queryByRole('link', { name: /Whitelist/i })).toBeNull();
  });

  it('marks the active route', () => {
    navState.pathname = '/batches';
    render(
      <TpoWorkspaceSectionNav
        sectionTitle="Candidates"
        items={items}
        navAriaLabel="Candidates sections"
      />,
    );

    expect(screen.getByRole('link', { name: /^Batches$/ }).getAttribute('aria-current')).toBe(
      'page',
    );
  });
});
