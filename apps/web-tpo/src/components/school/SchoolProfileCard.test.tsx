import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SchoolProfileCard } from './SchoolProfileCard';

describe('SchoolProfileCard', () => {
  it('renders name, student count, and upload controls', () => {
    render(
      <SchoolProfileCard
        profile={{
          institutionName: 'Riverdale State University',
          domain: 'riverdale.edu',
          verificationStatus: 'APPROVED',
          candidateUsage: 4812,
          candidateCapacity: 5000,
          tagline: 'Tagline',
          about: 'Riverdale partners with SMART to connect students to verified opportunities.',
          website: null,
          location: null,
          careersEmail: null,
        }}
        logoUrl={null}
        bannerUrl={null}
        employersRecruitingCount={312}
        onPickLogo={vi.fn()}
        onPickBanner={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Riverdale State University' })).toBeTruthy();
    expect(screen.getByText(/4,812 students on SMART/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Upload school logo' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Upload cover banner' })).toBeTruthy();
    expect(screen.getByText('312')).toBeTruthy();
  });
});
