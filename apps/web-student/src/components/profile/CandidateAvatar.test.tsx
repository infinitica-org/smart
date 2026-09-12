import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CandidateAvatar } from './CandidateAvatar';

describe('CandidateAvatar', () => {
  it('renders initials when no profile photo is available', () => {
    render(<CandidateAvatar fullName="Ada Lovelace" profilePhotoUrl={null} />);
    expect(screen.getByText('AL')).toBeTruthy();
  });

  it('keeps initials fallback available when a profile photo URL is provided', () => {
    render(
      <CandidateAvatar fullName="Ada Lovelace" profilePhotoUrl="https://cdn.example/photo.jpg" />,
    );
    expect(screen.getByText('AL')).toBeTruthy();
  });
});
