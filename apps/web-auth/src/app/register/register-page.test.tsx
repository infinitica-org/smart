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
      resendEmailVerification: vi.fn(),
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

  it('submits a valid registration and asks the student to verify before signing in', async () => {
    vi.mocked(api.auth.register).mockResolvedValue({
      email: 'jane@psgtech.ac.in',
      verificationRequired: true,
    });
    vi.mocked(api.auth.resendEmailVerification).mockResolvedValue(undefined);

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

    expect(await screen.findByRole('heading', { name: /Check your inbox/i })).toBeDefined();
    expect(api.auth.register).toHaveBeenCalledWith({
      fullName: 'Jane Doe',
      email: 'jane@psgtech.ac.in',
      password: 'Password123!',
      institutionId: 'inst_1',
    });
    expect(storeSession).not.toHaveBeenCalled();
    expect(redirectForRole).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Send a new verification link/i }));
    await waitFor(() =>
      expect(api.auth.resendEmailVerification).toHaveBeenCalledWith({
        email: 'jane@psgtech.ac.in',
      }),
    );
    expect(await screen.findByRole('status')).toBeDefined();
  });
});
