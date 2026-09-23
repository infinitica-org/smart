import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OverviewHero } from './account-state-panel';
import type { CompanyPortalAccount } from '@smart/contracts';

const account: CompanyPortalAccount = {
  userId: '123e4567-e89b-12d3-a456-426614174000',
  email: 'hr@acme.example',
  fullName: 'Jane Rep',
  role: 'COMPANY',
  institutionId: null,
  institutionName: null,
  companyId: '223e4567-e89b-12d3-a456-426614174001',
  companyName: 'Acme Corp',
  primaryTrack: null,
  secondaryTrack: null,
  provider: 'PASSWORD',
  emailVerified: true,
  createdAt: '2026-09-21T10:00:00.000Z',
  onboardingCompleted: true,
  profilePhotoUrl: null,
  cgpa: null,
  sscPercentage: null,
  hscPercentage: null,
  sessionHold: null,
  companyVerificationStatus: 'APPROVED',
  companyWebsite: 'https://acme.example',
  companyIndustry: 'Software',
  companyLocation: 'Bengaluru',
};

describe('OverviewHero', () => {
  it('renders the company name from server account data', () => {
    render(<OverviewHero account={account} />);
    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
    expect(screen.getByText('Jane Rep')).toBeTruthy();
    expect(screen.getByText('Approved')).toBeTruthy();
  });
});
