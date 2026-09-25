import type { CompanyProfile } from '@smart/contracts';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CompanyPublicView } from './company-public-view';

const profile = (over: Partial<CompanyProfile> = {}): CompanyProfile => ({
  companyId: '11111111-1111-4111-8111-111111111111',
  slug: 'acme-11111111',
  displayName: 'Acme Robotics',
  logoUrl: null,
  website: 'https://acme.test',
  about: 'We build robots.',
  benefits: ['Health cover'],
  socialLinks: { linkedin: 'https://linkedin.com/company/acme' },
  industry: 'Automotive',
  employeeCount: 'E_51_200',
  headquarters: 'Pune, India',
  additionalLocations: ['Chennai, India'],
  version: 3,
  isVerified: true,
  verifiedAt: '2026-09-01T10:00:00.000Z',
  ...over,
});

describe('CompanyPublicView', () => {
  afterEach(cleanup);

  it('shows the profile and the verified badge with the server date', () => {
    render(<CompanyPublicView profile={profile()} />);
    expect(screen.getByRole('heading', { name: 'Acme Robotics' })).toBeTruthy();
    expect(screen.getByText('Automotive · 51–200 employees')).toBeTruthy();
    expect(screen.getByText('Pune, India (headquarters)')).toBeTruthy();
    expect(screen.getByTestId('verified-badge').getAttribute('aria-label')).toBe(
      'SMART verified this company on 1 Sep 2026',
    );
  });

  it('hides the badge when the server does not report the company as verified', () => {
    render(<CompanyPublicView profile={profile({ isVerified: false, verifiedAt: null })} />);
    expect(screen.queryByTestId('verified-badge')).toBeNull();
  });

  it('shows an empty state for a company with no description or extras', () => {
    render(
      <CompanyPublicView
        profile={profile({
          about: null,
          benefits: [],
          socialLinks: {},
          additionalLocations: [],
          headquarters: null,
        })}
      />,
    );
    expect(screen.getByText('This company has not added a description yet.')).toBeTruthy();
    expect(screen.queryByText('Benefits')).toBeNull();
    expect(screen.queryByText('Locations')).toBeNull();
  });
});
