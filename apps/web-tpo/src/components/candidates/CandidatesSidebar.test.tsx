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

  it('lists repository and onboarding sections with correct hrefs', () => {
    render(<CandidatesWorkspaceNav />);

    for (const link of CANDIDATES_NAV) {
      expect(screen.getByRole('link', { name: new RegExp(link.name) }).getAttribute('href')).toBe(
        link.href,
      );
    }
  });

  it('marks the active subsection', () => {
    navState.pathname = '/provisioning';
    render(<CandidatesWorkspaceNav />);

    expect(
      screen.getByRole('link', { name: /Candidate Onboarding/ }).getAttribute('aria-current'),
    ).toBe('page');
    expect(
      screen.getByRole('link', { name: /Candidates Repository/ }).getAttribute('aria-current'),
    ).toBeNull();
  });
});
