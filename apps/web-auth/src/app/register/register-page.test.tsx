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
      register: vi.fn(),
      listInstitutions: vi.fn().mockResolvedValue([{ id: 'inst_1', name: 'PSG Tech' }]),
    },
  },
  storeSession: vi.fn(),
  redirectForRole: vi.fn(),
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.auth.listInstitutions).mockResolvedValue([{ id: 'inst_1', name: 'PSG Tech' }]);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders registration form fields', async () => {
    render(<RegisterPage />);

    expect(await screen.findByRole('heading', { name: /Create an account/i })).toBeDefined();
    expect(screen.getByLabelText(/First name/i)).toBeDefined();
    expect(screen.getByLabelText(/Last name/i)).toBeDefined();
    expect(screen.getByLabelText(/Mobile Number/i)).toBeDefined();
    expect(screen.getByLabelText(/School Email/i)).toBeDefined();
    expect(screen.getByLabelText(/^Password \*/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Get started/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /Login/i })).toBeDefined();
  });

  it('validates password match client-side', async () => {
    render(<RegisterPage />);

    fireEvent.change(await screen.findByLabelText(/First name/i), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/Last name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/Mobile Number/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/School Email/i), {
      target: { value: 'jane@psgtech.ac.in' },
    });
    fireEvent.change(screen.getByLabelText(/^Password \*/i), { target: { value: 'Password123!' } });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), {
      target: { value: 'DifferentPass!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Get started/i }));

    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeDefined();
    });
    expect(api.auth.register).not.toHaveBeenCalled();
  });

  it('handles API error for conflicting account', async () => {
    vi.mocked(api.auth.register).mockRejectedValue(
      new SmartApiError({
        error: 'conflict',
        message: 'An account with this email already exists.',
        statusCode: 409,
      }),
    );

    render(<RegisterPage />);

    fireEvent.change(await screen.findByLabelText(/First name/i), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/School Email/i), {
      target: { value: 'jane@psgtech.ac.in' },
    });
    fireEvent.change(screen.getByLabelText(/^Password \*/i), { target: { value: 'Password123!' } });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), {
      target: { value: 'Password123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Get started/i }));

    await waitFor(() => {
      expect(screen.getByText(/An account with this email already exists/i)).toBeDefined();
    });
  });

  it('submits valid registration, stores session and redirects to onboarding', async () => {
    vi.mocked(api.auth.register).mockResolvedValue({
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

    fireEvent.change(await screen.findByLabelText(/First name/i), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText(/Last name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/School Email/i), {
      target: { value: 'jane@psgtech.ac.in' },
    });
    fireEvent.change(screen.getByLabelText(/^Password \*/i), { target: { value: 'Password123!' } });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), {
      target: { value: 'Password123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Get started/i }));

    await waitFor(() => {
      expect(api.auth.register).toHaveBeenCalledWith({
        fullName: 'Jane Doe',
        email: 'jane@psgtech.ac.in',
        password: 'Password123!',
        institutionId: 'inst_1',
      });
    });

    expect(storeSession).toHaveBeenCalledWith('access_token_mock_123');
    expect(redirectForRole).toHaveBeenCalledWith('STUDENT', 'access_token_mock_123');
  });
});
