import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CompanySettingsPage from './page';

describe('Company settings page (Th6-427)', () => {
  it('links to Blocked users, so the page is reachable from navigation', () => {
    render(<CompanySettingsPage />);
    const link = screen.getByRole('link', { name: /blocked users/i });
    expect(link.getAttribute('href')).toBe('/settings/blocked');
  });
});
