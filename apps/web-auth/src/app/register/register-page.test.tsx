import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RegisterPage from './page';
import { SmartApiError } from '@smart/api-client';
import { api, redirectForRole, storeSession } from '../../lib/api';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('../../lib/api', () => ({
  api: {
    auth: {
      registerStudent: vi.fn(),
    },
  },
  storeSession: vi.fn(),
  redirectForRole: vi.fn(),
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders registration form fields', () => {
    render(<RegisterPage />);

    expect(screen.getByRole('heading', { name: /Student Registration/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeDefined();
    expect(screen.getByLabelText(/Full Name/i)).toBeDefined();
    expect(screen.getByLabelText(/School Email/i)).toBeDefined();
    expect(screen.getByLabelText(/^Password$/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /^Continue$/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /Sign up as an employer/i })).toBeDefined();
  });

  it('rejects personal email domain client-side', async () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Jane Student' } });
    fireEvent.change(screen.getByLabelText(/School Email/i), {
      target: { value: 'jane@gmail.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'Password123!' } });

    fireEvent.click(screen.getByRole('button', { name: /^Continue$/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Personal email addresses \(e\.g\. Gmail, Yahoo\) are not permitted/i),
      ).toBeDefined();
    });
    expect(api.auth.registerStudent).not.toHaveBeenCalled();
  });

  it('rejects weak password (< 8 characters) client-side', async () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Jane Student' } });
    fireEvent.change(screen.getByLabelText(/School Email/i), {
      target: { value: 'jane@psgtech.ac.in' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'pass' } });

    fireEvent.click(screen.getByRole('button', { name: /^Continue$/i }));

    await waitFor(() => {
      expect(screen.getByText(/Password must be at least 8 characters long/i)).toBeDefined();
    });
    expect(api.auth.registerStudent).not.toHaveBeenCalled();
  });

  it('handles API error for unregistered university domain', async () => {
    vi.mocked(api.auth.registerStudent).mockRejectedValue(
      new SmartApiError({
        error: 'unregistered_university_domain',
        message: 'Your university domain is not registered on SMART.',
        statusCode: 422,
      }),
    );

    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'Student Unregistered' },
    });
    fireEvent.change(screen.getByLabelText(/School Email/i), {
      target: { value: 'student@unknown-univ.edu' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'Password123!' } });

    fireEvent.click(screen.getByRole('button', { name: /^Continue$/i }));

    await waitFor(() => {
      expect(screen.getByText(/Your university domain is not registered on SMART/i)).toBeDefined();
    });
  });

  it('submits valid registration, stores session and redirects to onboarding', async () => {
    vi.mocked(api.auth.registerStudent).mockResolvedValue({
      accessToken: 'access_token_mock_123',
      tokenType: 'Bearer',
      expiresInSeconds: 900,
      user: {
        userId: 'usr_mock_1',
        email: 'jane@psgtech.ac.in',
        fullName: 'Jane Doe',
        role: 'STUDENT',
        institutionId: 'inst_1',
        institutionName: 'PSG Tech',
        primaryTrack: null,
        secondaryTrack: null,
        provider: 'PASSWORD',
        emailVerified: false,
        createdAt: '2026-09-23T14:00:00.000Z',
        onboardingCompleted: false,
        profilePhotoUrl: null,
        cgpa: null,
        sscPercentage: null,
        hscPercentage: null,
        sessionHold: null,
      },
    });

    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/School Email/i), {
      target: { value: 'jane@psgtech.ac.in' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'Password123!' } });

    fireEvent.click(screen.getByRole('button', { name: /^Continue$/i }));

    await waitFor(() => {
      expect(api.auth.registerStudent).toHaveBeenCalledWith({
        fullName: 'Jane Doe',
        email: 'jane@psgtech.ac.in',
        password: 'Password123!',
      });
    });

    expect(storeSession).toHaveBeenCalledWith('access_token_mock_123');
    expect(redirectForRole).toHaveBeenCalledWith('STUDENT', 'access_token_mock_123', null);
  });
});
