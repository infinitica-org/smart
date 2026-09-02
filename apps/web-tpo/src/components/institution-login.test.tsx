import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/api', () => ({
  api: {
    auth: {
      login: vi.fn(),
    },
  },
}));

vi.mock('@smart/ui', () => ({
  SmartLogo: ({ title }: { title?: string }) => <span>{title ?? 'SMART'}</span>,
}));

import { InstitutionLogin } from './institution-login';

describe('InstitutionLogin', () => {
  it('renders institution login branding and form', () => {
    render(<InstitutionLogin />);
    expect(screen.getByRole('heading', { name: 'Institution Login' })).toBeTruthy();
    expect(screen.getByText('Empower your students')).toBeTruthy();
    expect(screen.getByPlaceholderText('admin@college.edu')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(screen.getByText('Login to your account')).toBeTruthy();
    expect(screen.getByText('Upload Candidates')).toBeTruthy();
    expect(screen.getByText('Track Readiness')).toBeTruthy();
  });
});
