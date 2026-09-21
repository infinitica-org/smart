import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProfileHeroBanner } from './ProfileHeroBanner';

vi.mock('@/components/profile/ProfilePhotoEditControl', () => ({
  ProfilePhotoEditControl: () => <div data-testid="profile-photo-control" />,
}));

afterEach(() => {
  cleanup();
});

describe('ProfileHeroBanner', () => {
  it('renders identity, completion, and career summary in one hero card', () => {
    render(
      <ProfileHeroBanner
        user={{ userId: 'u1', fullName: 'Ada Lovelace', email: 'ada@test.edu' } as never}
        education={[
          {
            fieldOfStudy: 'Computer Science',
            institutionName: 'Sona College of Technology',
            startDate: '2022-01-01',
            endDate: '2026-01-01',
            current: true,
          } as never,
        ]}
        linkedinVerified={false}
        githubVerified={true}
        percent={38}
        completedCount={3}
        loading={false}
      />,
    );

    expect(screen.getByTestId('profile-hero-banner')).toBeTruthy();
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('Computer Science')).toBeTruthy();
    expect(screen.getByText('Batch 2022 – 2026')).toBeTruthy();
    expect(screen.getByText('Sona College of Technology')).toBeTruthy();
    expect(screen.getByText('GitHub')).toBeTruthy();
    expect(screen.queryByText('Career focus')).toBeNull();
    expect(screen.queryByText('Job preferences')).toBeNull();
    expect(
      screen.getByRole('progressbar', { name: 'Profile completion' }).getAttribute('aria-valuenow'),
    ).toBe('38');
    expect(screen.getByRole('button', { name: 'What is profile completion?' })).toBeTruthy();
    expect(screen.getByText('Profile completion')).toBeTruthy();
  });

  it('shows department placeholder only when education exists without field of study', () => {
    render(
      <ProfileHeroBanner
        user={{ userId: 'u1', fullName: 'Ada Lovelace', email: 'ada@test.edu' } as never}
        education={[{ institutionName: 'TVK - CBSE', current: true } as never]}
        linkedinVerified={false}
        githubVerified={false}
        percent={10}
        completedCount={1}
        loading={false}
      />,
    );

    expect(screen.getByText('Department not added yet')).toBeTruthy();
    expect(screen.getByText('TVK - CBSE')).toBeTruthy();
    expect(screen.queryByText(/Batch \d/)).toBeNull();
  });

  it('hides department line when there is no education data', () => {
    render(
      <ProfileHeroBanner
        user={{ userId: 'u1', fullName: 'Ada Lovelace', email: 'ada@test.edu' } as never}
        education={[]}
        linkedinVerified={false}
        githubVerified={false}
        percent={0}
        completedCount={0}
        loading={false}
      />,
    );

    expect(screen.queryByText('Department not added yet')).toBeNull();
    expect(screen.queryByText('College not added yet')).toBeNull();
  });
});
