import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CandidatesSidebar } from './CandidatesSidebar';

const navState = vi.hoisted(() => ({ pathname: '/students' }));

vi.mock('next/navigation', () => ({
  usePathname: () => navState.pathname,
}));

describe('CandidatesSidebar', () => {
  afterEach(() => {
    cleanup();
    navState.pathname = '/students';
  });

  it('lists repository and onboarding sections with correct hrefs', () => {
    render(<CandidatesSidebar />);

    expect(screen.getByRole('link', { name: 'Candidates Repository' }).getAttribute('href')).toBe(
      '/students',
    );
    expect(screen.getByRole('link', { name: 'Candidate Onboarding' }).getAttribute('href')).toBe(
      '/provisioning',
    );
    expect(screen.getByRole('link', { name: 'Batches' }).getAttribute('href')).toBe('/batches');
  });

  it('marks the active subsection', () => {
    navState.pathname = '/provisioning';
    render(<CandidatesSidebar />);

    expect(
      screen.getByRole('link', { name: 'Candidate Onboarding' }).getAttribute('aria-current'),
    ).toBe('page');
    expect(
      screen.getByRole('link', { name: 'Candidates Repository' }).getAttribute('aria-current'),
    ).toBeNull();
  });
});
