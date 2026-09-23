import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CANDIDATES_NAV } from '../../lib/tpo-nav';
import { CandidatesWorkspaceNav } from './CandidatesWorkspaceNav';

const navState = vi.hoisted(() => ({ pathname: '/students' }));

vi.mock('next/navigation', () => ({
  usePathname: () => navState.pathname,
}));

describe('CandidatesWorkspaceNav', () => {
  afterEach(() => {
    cleanup();
    navState.pathname = '/students';
  });

  it('lists students and batches only (no whitelist upload here)', () => {
    render(<CandidatesWorkspaceNav />);

    expect(CANDIDATES_NAV.map((l) => l.name)).toEqual(['Students', 'Batches']);
    for (const link of CANDIDATES_NAV) {
      expect(screen.getByRole('link', { name: new RegExp(link.name) }).getAttribute('href')).toBe(
        link.href,
      );
    }
    expect(screen.queryByRole('link', { name: /Whitelist/i })).toBeNull();
  });

  it('marks the active subsection', () => {
    navState.pathname = '/batches';
    render(<CandidatesWorkspaceNav />);

    expect(screen.getByRole('link', { name: /^Batches$/ }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(
      screen.getByRole('link', { name: /^Students$/ }).getAttribute('aria-current'),
    ).toBeNull();
  });
});
