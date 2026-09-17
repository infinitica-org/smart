import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ProfileAvatarProgressRing } from './ProfileAvatarProgressRing';

afterEach(() => {
  cleanup();
});

describe('ProfileAvatarProgressRing', () => {
  it('exposes completion as a circular progressbar around the avatar slot', () => {
    render(
      <ProfileAvatarProgressRing percent={50}>
        <span>Avatar</span>
      </ProfileAvatarProgressRing>,
    );

    expect(screen.getByText('Avatar')).toBeTruthy();
    const ring = screen.getByTestId('profile-avatar-progress-ring');
    expect(ring.getAttribute('aria-valuenow')).toBe('50');
    expect(ring.querySelector('circle[stroke="var(--ds-green)"]')).toBeTruthy();
    expect(ring.querySelector('.flex.gap-1')).toBeNull();
  });
});
