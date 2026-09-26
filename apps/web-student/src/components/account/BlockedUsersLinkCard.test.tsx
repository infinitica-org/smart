import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BlockedUsersLinkCard } from './BlockedUsersLinkCard';

describe('BlockedUsersLinkCard (Th6-427)', () => {
  it('links Settings to the blocked users page', () => {
    render(<BlockedUsersLinkCard />);
    const link = screen.getByRole('link', { name: 'Manage blocked users' });
    expect(link.getAttribute('href')).toBe('/settings/blocked');
  });
});
